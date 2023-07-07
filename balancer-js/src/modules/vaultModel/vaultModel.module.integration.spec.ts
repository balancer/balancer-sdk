// yarn test:only ./src/modules/vaultModel/vaultModel.module.integration.spec.ts
import dotenv from 'dotenv';
import { expect } from 'chai';
import { BigNumber, parseFixed } from '@ethersproject/bignumber';
import { MaxUint256 } from '@ethersproject/constants';
import { JsonRpcProvider, JsonRpcSigner } from '@ethersproject/providers';
import {
  SOR,
  SubgraphPoolBase,
  TokenPriceService,
  SwapTypes,
} from '@balancer-labs/sor';
import {
  BalancerSDK,
  Network,
  RelayerAuthorization,
  BALANCER_NETWORK_CONFIG,
} from '@/index';
import {
  buildRelayerCalls,
  someJoinExit,
} from '@/modules/swaps/joinExit/joinAndExit';
import {
  BAL_WETH,
  AURA_BAL_STABLE,
  B_50WBTC_50WETH,
  getForkedPools,
  GRAVI_AURA,
} from '@/test/lib/mainnetPools';
import { MockPoolDataService } from '@/test/lib/mockPool';
import { ADDRESSES, TEST_BLOCK } from '@/test/lib/constants';
import { Contracts } from '../contracts/contracts.module';
import { accuracy, forkSetup, getBalances } from '@/test/lib/utils';
import { VaultModel, Requests, ActionType } from './vaultModel.module';
import { ExitPoolRequest } from './poolModel/exit';
import { JoinPoolRequest } from './poolModel/join';
import { BatchSwapRequest } from './poolModel/swap';
import {
  EncodeJoinPoolInput,
  EncodeBatchSwapInput,
  ExitPoolData,
} from '@/modules/relayer/relayer.module';

dotenv.config();

const { ALCHEMY_URL: jsonRpcUrl } = process.env;
const networkId = Network.MAINNET;
const rpcUrl = 'http://127.0.0.1:8545';
const provider = new JsonRpcProvider(rpcUrl, networkId);
let sor: SOR;

const { contracts } = new Contracts(networkId, provider);

const signer = provider.getSigner();
const relayerAddress =
  BALANCER_NETWORK_CONFIG[networkId].addresses.contracts.balancerRelayer;
const wrappedNativeAsset =
  BALANCER_NETWORK_CONFIG[networkId].addresses.tokens.wrappedNativeAsset;

describe('join and exit integration tests', async () => {
  await testFlow(
    'exit',
    [BAL_WETH],
    parseFixed('7', 18).toString(),
    ADDRESSES[networkId].BAL8020BPT,
    ADDRESSES[networkId].WETH,
    '50' // 50 bsp = 0.5%
  );
  await testFlow(
    'join',
    [BAL_WETH],
    parseFixed('7', 18).toString(),
    ADDRESSES[networkId].WETH,
    ADDRESSES[networkId].BAL8020BPT,
    '10' // 10 bsp = 0.1%
  );
  await testFlow(
    'swap > join - WBTC[Swap]WETH[join]BPT',
    [BAL_WETH, B_50WBTC_50WETH],
    parseFixed('7', 8).toString(),
    ADDRESSES[networkId].WBTC,
    ADDRESSES[networkId].BAL8020BPT,
    '50' // 50 bsp = 0.5%
  );
  await testFlow(
    'swap > exit - auraBAL[Swap]BPT[exit]WETH',
    [BAL_WETH, AURA_BAL_STABLE],
    parseFixed('7', 18).toString(),
    ADDRESSES[networkId].auraBal,
    ADDRESSES[networkId].WETH,
    '10' // 10 bsp = 0.1%
  );
  await testFlow(
    'join > swap - WETH[join]BPT[Swap]auraBAL',
    [BAL_WETH, AURA_BAL_STABLE],
    parseFixed('18', 18).toString(),
    ADDRESSES[networkId].WETH,
    ADDRESSES[networkId].auraBal,
    '10' // 10 bsp = 0.1%
  );
  await testFlow(
    'exit > swap - BPT[Exit]WETH[Swap]WBTC',
    [BAL_WETH, B_50WBTC_50WETH],
    parseFixed('7', 18).toString(),
    ADDRESSES[networkId].BAL8020BPT,
    ADDRESSES[networkId].WBTC,
    '10' // 10 bsp = 0.1%
  );
  await testFlow(
    'join > swap - BAL[Join]BPT[Swap]auraBal',
    [BAL_WETH, AURA_BAL_STABLE],
    parseFixed('7', 18).toString(),
    ADDRESSES[networkId].BAL,
    ADDRESSES[networkId].auraBal,
    '50' // 50 bsp = 0.5%
  );
  await testFlow(
    'join > swap + swap - WETH[join]BPT[Swap]auraBAL, WETH[Swap]auraBAL',
    [BAL_WETH, AURA_BAL_STABLE, GRAVI_AURA],
    parseFixed('18', 18).toString(),
    ADDRESSES[networkId].WETH,
    ADDRESSES[networkId].auraBal,
    '10' // 10 bsp = 0.1%
  );
});

async function testFlow(
  description: string,
  pools: SubgraphPoolBase[],
  swapAmount: string,
  tokenIn: {
    address: string;
    decimals: number;
    symbol: string;
    slot: number;
  },
  tokenOut: {
    address: string;
    decimals: number;
    symbol: string;
    slot: number;
  },
  slippage: string
): Promise<void> {
  context(`${description}`, () => {
    // For now we only support ExactIn case
    const swapType = SwapTypes.SwapExactIn;
    let vaultModel: VaultModel;
    // Setup chain
    before(async function () {
      this.timeout(20000);
      // const tokens = [tokenIn.address, ADDRESSES[networkId].BAL8020BPT.address];
      // const balances = [parseFixed('100', tokenIn.decimals).toString(), parseFixed('100', 18).toString()];
      // const slots = [tokenIn.slot, ADDRESSES[networkId].BAL8020BPT.slot];
      const tokens = [tokenIn.address];
      const balances = [parseFixed('100', tokenIn.decimals).toString()];
      const slots = [tokenIn.slot];
      await forkSetup(
        signer,
        tokens,
        slots,
        balances,
        jsonRpcUrl as string,
        TEST_BLOCK[networkId]
      );
      [sor, vaultModel] = await setUp(networkId, provider, pools);
      await sor.fetchPools();
    });

    it('model should match onchain', async () => {
      const swapInfo = await sor.getSwaps(
        tokenIn.address,
        tokenOut.address,
        swapType,
        swapAmount,
        undefined,
        true
      );
      const signerAddr = await signer.getAddress();
      const authorisation = await signRelayerApproval(
        relayerAddress,
        signerAddr,
        signer
      );
      const pools = sor.getPools();
      expect(someJoinExit(pools, swapInfo.swaps, swapInfo.tokenAddresses)).to.be
        .true;

      const callData = buildRelayerCalls(
        swapInfo,
        pools,
        signerAddr,
        relayerAddress,
        wrappedNativeAsset,
        slippage,
        authorisation
      );

      const multicalls: Requests[] = [];
      // EncodeBatchSwapInput | ExitPoolData | EncodeJoinPoolInput
      // TODO - Remove the need to manipulate this data - see what the GeneralisedJoin/Exits look like first.
      callData.inputs.forEach((input) => {
        if ('swapType' in input) {
          const call = input as EncodeBatchSwapInput;
          // call.outputReferences;
          const batchSwap: BatchSwapRequest = {
            actionType: ActionType.BatchSwap,
            swaps: call.swaps,
            assets: call.assets,
            funds: call.funds,
            swapType: call.swapType,
            outputReferences: call.outputReferences,
          };
          multicalls.push(batchSwap);
        } else if ('exitPoolRequest' in input) {
          // ExitPoolData
          const call = input as ExitPoolData;
          // call.outputReferences
          const exit: ExitPoolRequest = {
            actionType: ActionType.Exit,
            poolId: call.poolId,
            encodedUserData: call.userData,
            outputReferences: call.outputReferences,
          };
          multicalls.push(exit);
        } else if ('joinPoolRequest' in input) {
          // JoinPoolInput
          const call = input as EncodeJoinPoolInput;
          // call.outputReference;
          const join: JoinPoolRequest = {
            actionType: ActionType.Join,
            poolId: call.poolId,
            encodedUserData: call.joinPoolRequest.userData,
            outputReference: call.outputReference,
          };
          multicalls.push(join);
        }
      });

      const modelResults = await vaultModel.multicall(multicalls);
      const [tokenInBalanceBefore, tokenOutBalanceBefore] = await getBalances(
        [
          tokenIn.address,
          tokenOut.address,
          ADDRESSES[networkId].BAL8020BPT.address,
        ],
        signer,
        signerAddr
      );
      await signer.sendTransaction({
        to: callData.to,
        data: callData.data,
      });

      const [tokenInBalanceAfter, tokenOutBalanceAfter] = await getBalances(
        [
          tokenIn.address,
          tokenOut.address,
          ADDRESSES[networkId].BAL8020BPT.address,
        ],
        signer,
        signerAddr
      );
      const tokenInBalanceChange = tokenInBalanceBefore
        .sub(tokenInBalanceAfter)
        .abs()
        .toString();
      const tokenOutBalanceChange = tokenOutBalanceBefore
        .sub(tokenOutBalanceAfter)
        .abs()
        .toString();
      expect(modelResults[tokenIn.address].toString()).to.eq(
        tokenInBalanceChange.toString()
      );
      expect(modelResults[tokenOut.address].isNegative()).to.be.true;
      expect(
        accuracy(
          modelResults[tokenOut.address].mul(-1),
          BigNumber.from(tokenOutBalanceChange)
        )
      ).to.be.closeTo(1, 1e-2); // inaccuracy should not be over to 1%
    }).timeout(10000000);
  });
}

async function setUp(
  networkId: Network,
  provider: JsonRpcProvider,
  pools: SubgraphPoolBase[]
): Promise<[SOR, VaultModel]> {
  const forkedPools = await getForkedPools(provider, pools);
  class CoingeckoTokenPriceService implements TokenPriceService {
    constructor(private readonly chainId: number) {}
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async getNativeAssetPriceInToken(tokenAddress: string): Promise<string> {
      return '0';
    }
  }
  const poolsRepository = new MockPoolDataService(forkedPools);
  const sdkConfig = {
    network: networkId,
    rpcUrl,
    sor: {
      tokenPriceService: new CoingeckoTokenPriceService(networkId),
      poolDataService: poolsRepository,
      fetchOnChainBalances: true,
    },
  };
  const vaultModel = new VaultModel(
    poolsRepository,
    ADDRESSES[Network.MAINNET].WETH.address
  );
  const balancer = new BalancerSDK(sdkConfig);
  return [balancer.sor, vaultModel];
}

const signRelayerApproval = async (
  relayerAddress: string,
  signerAddress: string,
  signer: JsonRpcSigner
): Promise<string> => {
  const approval = contracts.vault.interface.encodeFunctionData(
    'setRelayerApproval',
    [signerAddress, relayerAddress, true]
  );

  const signature =
    await RelayerAuthorization.signSetRelayerApprovalAuthorization(
      contracts.vault,
      signer,
      relayerAddress,
      approval
    );

  const calldata = RelayerAuthorization.encodeCalldataAuthorization(
    '0x',
    MaxUint256,
    signature
  );

  return calldata;
};
