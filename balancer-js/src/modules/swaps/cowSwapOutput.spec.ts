// yarn test:only ./src/modules/swaps/cowSwapOutput.spec.ts
import dotenv from 'dotenv';
import { BigNumber, parseFixed } from '@ethersproject/bignumber';
import { MaxUint256 } from '@ethersproject/constants';
import { JsonRpcProvider, JsonRpcSigner } from '@ethersproject/providers';
import {
  SubgraphPoolBase,
  TokenPriceService,
  SwapTypes,
} from '@balancer-labs/sor';
import {
  BalancerSDK,
  getSwapInfoSlippageTolerance,
  Network,
  RelayerAuthorization,
} from '@/index';
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
import sampleInput from './cowSwapData/sampleInput.json';

dotenv.config();

const { ALCHEMY_URL: jsonRpcUrl } = process.env;
const networkId = Network.MAINNET;
const rpcUrl = 'http://127.0.0.1:8545';
const provider = new JsonRpcProvider(rpcUrl, networkId);
let balancer: BalancerSDK;

const { contracts } = new Contracts(networkId, provider);

const signer = provider.getSigner();

describe('cowSwap output tests', async () => {
  await testFlow(
    'cowSwap output',
    [BAL_WETH, AURA_BAL_STABLE],
    parseFixed('7', 18).toString(),
    ADDRESSES[networkId].WETH,
    ADDRESSES[networkId].BAL,
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
      const input = sampleInput;
      const inputOrder = input.orders[0];
      await balancer.swaps.fetchPools();

      const tokenIn = inputOrder.sell_token;
      const tokenOut = inputOrder.buy_token;
      const gasPrice = BigNumber.from(Math.floor(input.metadata.gas_price));
      const swapGas = BigNumber.from('200000');
      const swapInfo = await balancer.sor.getSwaps(
        tokenIn,
        tokenOut,
        swapType,
        swapAmount,
        { gasPrice, swapGas },
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
      const swapInfoSlippageTolerance = getSwapInfoSlippageTolerance(swapInfo);
      const callData = buildCalls(
        pools,
        tokenIn,
        tokenOut,
        swapInfoSlippageTolerance,
        signerAddr,
        authorisation,
        swapType
      );
      const output = await balancer.swaps.formatSwapsForGnosis(
        swapInfo,
        input,
        relayerAddress,
        callData.data,
        swapGas
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
