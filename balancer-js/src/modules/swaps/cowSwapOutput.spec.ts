// yarn test:only ./src/modules/swaps/cowSwapOutput.spec.ts
import dotenv from 'dotenv';
import { parseFixed } from '@ethersproject/bignumber';
import { MaxUint256 } from '@ethersproject/constants';
import { JsonRpcProvider, JsonRpcSigner } from '@ethersproject/providers';
import {
  SubgraphPoolBase,
  TokenPriceService,
  SwapTypes,
} from '@balancer-labs/sor';
import { BalancerSDK, Network, RelayerAuthorization } from '@/index';
import { buildCalls } from './joinAndExit';
import {
  BAL_WETH,
  AURA_BAL_STABLE,
  getForkedPools,
} from '@/test/lib/mainnetPools';
import { MockPoolDataService } from '@/test/lib/mockPool';
import { ADDRESSES } from '@/test/lib/constants';
import { Contracts } from '../contracts/contracts.module';
import { forkSetup } from '@/test/lib/utils';
dotenv.config();

const { ALCHEMY_URL: jsonRpcUrl } = process.env;
const networkId = Network.MAINNET;
const rpcUrl = 'http://127.0.0.1:8545';
const provider = new JsonRpcProvider(rpcUrl, networkId);
let balancer: BalancerSDK;
// let sor: SOR;

const { contracts } = new Contracts(networkId, provider);

const signer = provider.getSigner();

describe('cowSwap output tests', async () => {
  await testFlow(
    'cowSwap output',
    [BAL_WETH, AURA_BAL_STABLE],
    parseFixed('7', 18).toString(),
    ADDRESSES[networkId].BAL, // .auraBal,
    ADDRESSES[networkId].WETH,
    SwapTypes.SwapExactIn
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
      balancer = await setUp(networkId, provider, pools);
      await balancer.sor.fetchPools();
    });

    it('should produce CowSwap output for an SOR query', async () => {
      const useBpts = true;
      const referenceToken = ADDRESSES[networkId].WETH.address;
      await balancer.swaps.fetchPools();
      // Check whether the following produces the same result
      /* const gasPrice = parseFixed('1', 9);
      const amount = BigNumber.from(swapAmount);
      const params = {
        tokenIn: tokenIn.address,
        tokenOut: tokenOut.address,
        amount,
        gasPrice: gasPrice,
        maxPools: 4,
        useBpts: true,
      };
      const swapInfo = await balancer.swaps.findRouteGivenIn(params);*/
      const swapInfo = await balancer.sor.getSwaps(
        tokenIn.address,
        tokenOut.address,
        swapType,
        swapAmount,
        undefined,
        true
      );
      const relayerAddress = ADDRESSES[networkId].BatchRelayerV4.address;
      const signerAddr = await signer.getAddress();
      const authorisation = await signRelayerApproval(
        relayerAddress,
        signerAddr,
        signer
      );
      const pools = balancer.sor.getPools(useBpts);
      const callData = buildCalls(
        pools,
        tokenIn.address,
        tokenOut.address,
        swapInfo,
        signerAddr,
        authorisation,
        swapType
      );
      const output = await balancer.swaps.formatSwapsForGnosis(
        swapInfo,
        referenceToken,
        relayerAddress,
        callData.data,
        useBpts
      );
      console.log(output);
    }).timeout(10000000);
  });
}

async function setUp(
  networkId: Network,
  provider: JsonRpcProvider,
  pools: SubgraphPoolBase[]
): Promise<BalancerSDK> {
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
  return balancer;
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
