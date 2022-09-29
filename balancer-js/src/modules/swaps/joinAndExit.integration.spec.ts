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

async function testFlow(
  description: string,
  pools: SubgraphPoolBase[],
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
  }
): Promise<void> {
  context(`${description}`, () => {
    // Setup chain
    before(async function () {
      this.timeout(20000);
      const tokens = [tokenIn.address];
      const balances = [parseFixed('100', 18).toString()];
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
      const swapAmount = parseFixed('7', 18);
      const swapType = SwapTypes.SwapExactIn;
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
        swapType
      );

      const [tokenInBalanceBefore, tokenOutBalanceBefore] = await getBalances(
        [tokenIn.address, tokenOut.address],
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
        [tokenIn.address, tokenOut.address],
        signer,
        signerAddr
      );
      console.log(tokenInBalanceBefore.toString());
      console.log(tokenOutBalanceBefore.toString());
      console.log(tokenInBalanceAfter.toString());
      console.log(tokenOutBalanceAfter.toString());
      console.log(swapInfo.returnAmount.toString());
      expect(tokenOutBalanceBefore.toString()).to.eq('0');
      expect(swapInfo.returnAmount.gt('0')).to.be.true;
      expect(tokenInBalanceBefore.sub(tokenInBalanceAfter).toString()).to.eq(
        swapAmount.toString()
      );
      expect(tokenOutBalanceAfter.gte(swapInfo.returnAmount));
    }).timeout(10000000);
  });
}

describe('join and exit integration tests', async () => {
  await testFlow(
    'exit',
    [BAL_WETH],
    ADDRESSES[networkId].BAL8020BPT,
    ADDRESSES[networkId].WETH
  );
  await testFlow(
    'join',
    [BAL_WETH],
    ADDRESSES[networkId].WETH,
    ADDRESSES[networkId].BAL8020BPT
  );
  await testFlow(
    'swap > exit',
    [BAL_WETH, AURA_BAL_STABLE],
    ADDRESSES[networkId].auraBal,
    ADDRESSES[networkId].WETH
  );
});

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
