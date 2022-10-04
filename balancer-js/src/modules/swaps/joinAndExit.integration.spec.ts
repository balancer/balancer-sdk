// yarn test:only ./src/modules/swaps/joinAndExit.integration.spec.ts
import dotenv from 'dotenv';
import { expect } from 'chai';
import { parseFixed } from '@ethersproject/bignumber';
import { MaxUint256 } from '@ethersproject/constants';
import { JsonRpcProvider, JsonRpcSigner } from '@ethersproject/providers';
import {
  SOR,
  SubgraphPoolBase,
  TokenPriceService,
  SwapTypes,
} from '@balancer-labs/sor';
import { BalancerSDK, Network, RelayerAuthorization } from '@/index';
import { buildCalls, someJoinExit } from './joinAndExit';
import {
  BAL_WETH,
  AURA_BAL_STABLE,
  B_50WBTC_50WETH,
  getForkedPools,
} from '@/test/lib/mainnetPools';
import { MockPoolDataService } from '@/test/lib/mockPool';
import { ADDRESSES } from '@/test/lib/constants';
import { Contracts } from '../contracts/contracts.module';
import { forkSetup, getBalances } from '@/test/lib/utils';
dotenv.config();

const { ALCHEMY_URL: jsonRpcUrl } = process.env;
const networkId = Network.MAINNET;
const rpcUrl = 'http://127.0.0.1:8545';
const provider = new JsonRpcProvider(rpcUrl, networkId);
const gasLimit = 8e6;
let sor: SOR;

const { contracts } = new Contracts(networkId, provider);

const signer = provider.getSigner();
const relayerV4Address = '0x2536dfeeCB7A0397CF98eDaDA8486254533b1aFA';
const wrappedNativeAsset = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';

describe('join and exit integration tests', async () => {
  await testFlow(
    'exit',
    [BAL_WETH],
    parseFixed('7', 18).toString(),
    ADDRESSES[networkId].BAL8020BPT,
    ADDRESSES[networkId].WETH,
    SwapTypes.SwapExactIn
  );
  await testFlow(
    'join',
    [BAL_WETH],
    parseFixed('7', 18).toString(),
    ADDRESSES[networkId].WETH,
    ADDRESSES[networkId].BAL8020BPT,
    SwapTypes.SwapExactIn
  );
  await testFlow(
    'swap > exit - auraBAL[Swap]BPT[exit]WETH',
    [BAL_WETH, AURA_BAL_STABLE],
    parseFixed('7', 18).toString(),
    ADDRESSES[networkId].auraBal,
    ADDRESSES[networkId].WETH,
    SwapTypes.SwapExactIn
  );
  await testFlow(
    'swap > join - WBTC[Swap]WETH[join]BPT',
    [BAL_WETH, B_50WBTC_50WETH],
    parseFixed('7', 8).toString(),
    ADDRESSES[networkId].WBTC,
    ADDRESSES[networkId].BAL8020BPT,
    SwapTypes.SwapExactIn
  );
  await testFlow(
    'exit > swap - BPT[Exit]WETH[Swap]WBTC',
    [BAL_WETH, B_50WBTC_50WETH],
    parseFixed('7', 18).toString(),
    ADDRESSES[networkId].BAL8020BPT,
    ADDRESSES[networkId].WBTC,
    SwapTypes.SwapExactIn
  );
  await testFlow(
    'join > swap - BAL[Join]BPT[Swap]auraBal',
    [BAL_WETH, AURA_BAL_STABLE],
    parseFixed('7', 18).toString(),
    ADDRESSES[networkId].BAL,
    ADDRESSES[networkId].auraBal,
    SwapTypes.SwapExactIn
  );
  await testFlow(
    'exit',
    [BAL_WETH],
    parseFixed('0.78', 18).toString(),
    ADDRESSES[networkId].BAL8020BPT,
    ADDRESSES[networkId].WETH,
    SwapTypes.SwapExactOut
  );
  await testFlow(
    'join',
    [BAL_WETH],
    parseFixed('7', 18).toString(),
    ADDRESSES[networkId].WETH,
    ADDRESSES[networkId].BAL8020BPT,
    SwapTypes.SwapExactOut
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
  swapType: SwapTypes
): Promise<void> {
  context(`${description}`, () => {
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
        15624161
      );
      sor = await setUp(networkId, provider, pools);
      await sor.fetchPools();
    });

    it('should exit swap via Relayer', async () => {
      const swapInfo = await sor.getSwaps(
        tokenIn.address,
        tokenOut.address,
        swapType,
        swapAmount,
        undefined,
        true
      );
      expect(someJoinExit(swapInfo.swaps, swapInfo.tokenAddresses)).to.be.true;

      const signerAddr = await signer.getAddress();
      const authorisation = await signRelayerApproval(
        ADDRESSES[networkId].BatchRelayerV4.address,
        signerAddr,
        signer
      );
      const pools = sor.getPools();
      const callData = buildCalls(
        pools,
        tokenIn.address,
        tokenOut.address,
        swapInfo,
        signerAddr,
        authorisation,
        swapType,
        relayerV4Address,
        wrappedNativeAsset
      );

      const [tokenInBalanceBefore, tokenOutBalanceBefore] = await getBalances(
        [
          tokenIn.address,
          tokenOut.address,
          ADDRESSES[networkId].BAL8020BPT.address,
        ],
        signer,
        signerAddr
      );
      const response = await signer.sendTransaction({
        to: callData.to,
        data: callData.data,
        gasLimit,
      });

      const receipt = await response.wait();
      console.log('Gas used', receipt.gasUsed.toString());
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

      console.log(tokenInBalanceBefore.toString(), 'tokenInBalance before');
      console.log(tokenInBalanceAfter.toString(), 'tokenInBalance after');
      console.log(tokenInBalanceChange.toString(), 'tokenInBalance change');
      console.log(tokenOutBalanceBefore.toString(), 'tokenOutBalance before');
      console.log(tokenOutBalanceAfter.toString(), 'tokenOutBalance after');
      console.log(tokenOutBalanceChange.toString(), 'tokenOutBalanceChange');
      console.log(swapInfo.returnAmount.toString(), 'returnAmount');
      console.log(swapAmount.toString(), 'swapAmount');
      expect(tokenOutBalanceBefore.toString()).to.eq('0');
      expect(swapInfo.returnAmount.gt('0')).to.be.true;
      if (swapType === SwapTypes.SwapExactIn) {
        expect(tokenInBalanceChange).to.eq(swapAmount.toString());
        expect(swapInfo.returnAmount.lte(tokenOutBalanceChange)).to.be.true;
      } else {
        expect(tokenOutBalanceChange).to.eq(swapAmount.toString());
        expect(swapInfo.returnAmount.gte(tokenInBalanceChange)).to.be.true;
      }
    }).timeout(10000000);
  });
}

async function setUp(
  networkId: Network,
  provider: JsonRpcProvider,
  pools: SubgraphPoolBase[]
): Promise<SOR> {
  const forkedPools = await getForkedPools(provider, pools);
  class CoingeckoTokenPriceService implements TokenPriceService {
    constructor(private readonly chainId: number) {}
    async getNativeAssetPriceInToken(tokenAddress: string): Promise<string> {
      return '0';
    }
  }
  const sdkConfig = {
    network: networkId,
    rpcUrl,
    sor: {
      tokenPriceService: new CoingeckoTokenPriceService(networkId),
      poolDataService: new MockPoolDataService(forkedPools),
      fetchOnChainBalances: true,
    },
  };
  const balancer = new BalancerSDK(sdkConfig);
  return balancer.sor;
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
