// yarn test:only ./src/modules/swaps/cowSwapOutput.spec.ts
import dotenv from 'dotenv';
import { BigNumber } from '@ethersproject/bignumber';
import { MaxUint256 } from '@ethersproject/constants';
import { JsonRpcProvider, JsonRpcSigner } from '@ethersproject/providers';
import {
  SubgraphPoolBase,
  TokenPriceService,
  SwapTypes,
} from '@balancer-labs/sor';
import {
  BalancerSDK,
  cowSwapInput,
  getSwapInfoWithSlippageTolerance,
  Network,
  RelayerAuthorization,
} from '@/index';
import { buildCalls } from './joinAndExit';
import {
  BAL_WETH,
  AURA_BAL_STABLE,
  getForkedPools,
  B_50WBTC_50WETH,
} from '@/test/lib/mainnetPools';
import { MockPoolDataService } from '@/test/lib/mockPool';
import { ADDRESSES } from '@/test/lib/constants';
import { Contracts } from '../contracts/contracts.module';
import sampleInput from './cowSwapData/sampleInput.json';
import sampleInput2 from './cowSwapData/sampleInput2.json';
import { CoingeckoTokenPriceService } from '../sor/token-price/coingeckoTokenPriceService';

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
    sampleInput,
    [BAL_WETH, AURA_BAL_STABLE],
    SwapTypes.SwapExactIn
  );
});

describe('cowSwap output tests 2', async () => {
  await testFlow(
    'cowSwap output',
    sampleInput2,
    [BAL_WETH, AURA_BAL_STABLE, B_50WBTC_50WETH],
    SwapTypes.SwapExactIn
  );
});

async function testFlow(
  description: string,
  cowSwapInput: cowSwapInput,
  pools: SubgraphPoolBase[],
  swapType: SwapTypes
): Promise<void> {
  context(`${description}`, () => {
    // Setup chain
    before(async function () {
      this.timeout(20000);
      balancer = await setUp(networkId, provider, pools);
      await balancer.sor.fetchPools();
    });

    it('should produce CowSwap output for an SOR query', async () => {
      const useBpts = true;
      const input = cowSwapInput;
      const inputOrder = input.orders[0];
      await balancer.swaps.fetchPools();

      const tokenIn = inputOrder.sell_token;
      const tokenOut = inputOrder.buy_token;
      const decimalsOut = input.tokens[tokenOut].decimals as number;
      const gasPrice = BigNumber.from(Math.floor(input.metadata.gas_price));
      const swapGas = BigNumber.from('200000');
      const swapInfo = await balancer.sor.getSwaps(
        tokenIn,
        tokenOut,
        swapType,
        inputOrder.sell_amount,
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
      // Deal with slippage tolerance
      // First compute tokenOutPriceInUsd
      const tokenPriceService = new CoingeckoTokenPriceService(networkId);
      const tokenOutPriceInEth =
        await tokenPriceService.getTokenPriceInNativeAsset(tokenOut);
      const ethPriceInUsd = await tokenPriceService.getNativeAssetPriceInToken(
        ADDRESSES[networkId].USDT.address
      );
      const tokenOutPriceInUsd =
        Number(tokenOutPriceInEth) * Number(ethPriceInUsd);

      // Modify return amount at callData to tolerate slippage
      const swapInfoWithSlippageTolerance = getSwapInfoWithSlippageTolerance(
        swapInfo,
        tokenOutPriceInUsd,
        decimalsOut
      );
      const callData = buildCalls(
        pools,
        tokenIn,
        tokenOut,
        swapInfoWithSlippageTolerance,
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
