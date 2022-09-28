// yarn test:only ./src/modules/swaps/joinAndExit.integration.spec.ts
import dotenv from 'dotenv';
import { expect } from 'chai';
import { parseFixed } from '@ethersproject/bignumber';
import { MaxUint256 } from '@ethersproject/constants';
import { JsonRpcProvider, JsonRpcSigner } from '@ethersproject/providers';
import {
  SOR,
  SubgraphPoolBase,
  SwapTypes,
  TokenPriceService,
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
const rpcUrl = 'http://127.0.0.1:8545';
const provider = new JsonRpcProvider(rpcUrl, 1);
const MAX_GAS_LIMIT = 8e6;

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

let sor: SOR;
const bal = ADDRESSES[Network.MAINNET].BAL.address;
const weth = ADDRESSES[Network.MAINNET].WETH.address;
const balBpt = '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56';

const { contracts } = new Contracts(Network.MAINNET, provider);

const signer = provider.getSigner();

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

describe('join and exit integration tests', () => {
  context('exit', () => {
    const tokenIn = balBpt;
    const tokenOut = weth;
    // Setup chain
    before(async function () {
      this.timeout(20000);
      const networkId = Network.MAINNET;
      const tokens = [tokenIn];
      const balances = [parseFixed('100', 18).toString()];
      const slots = [0];
      await forkSetup(
        signer,
        tokens,
        slots,
        balances,
        jsonRpcUrl as string,
        15624161
      );
      sor = await setUp(networkId, provider, [BAL_WETH]);
      await sor.fetchPools();
    });

    it('Exit', async () => {
      const swapAmount = parseFixed('7', 18);
      const swapType = SwapTypes.SwapExactIn;
      const swapInfo = await sor.getSwaps(
        tokenIn,
        tokenOut,
        swapType,
        swapAmount,
        undefined,
        true
      );
      expect(someJoinExit(swapInfo.swaps, swapInfo.tokenAddresses)).to.be.true;

      const signerAddr = await signer.getAddress();
      const authorisation = await signRelayerApproval(
        '0x2536dfeeCB7A0397CF98eDaDA8486254533b1aFA',
        signerAddr,
        signer
      );
      const callData = buildCalls(
        tokenIn,
        tokenOut,
        swapInfo,
        signerAddr,
        authorisation
      );

      const [tokenInBalanceBefore, tokenOutBalanceBefore] = await getBalances(
        [tokenIn, tokenOut],
        signer,
        signerAddr
      );
      const gasLimit = MAX_GAS_LIMIT;
      // const tx = await relayerContract.multicall([]);
      const response = await signer.sendTransaction({
        to: callData.to,
        data: callData.data,
        gasLimit,
      });

      const receipt = await response.wait();
      console.log('Gas used', receipt.gasUsed.toString());
      const [tokenInBalanceAfter, tokenOutBalanceAfter] = await getBalances(
        [tokenIn, tokenOut],
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

  context('join', () => {
    const tokenIn = weth;
    const tokenOut = balBpt;
    // Setup chain
    before(async function () {
      this.timeout(20000);
      const networkId = Network.MAINNET;
      const tokens = [tokenIn];
      const balances = [parseFixed('100', 18).toString()];
      const slots = [3];

      await forkSetup(
        signer,
        tokens,
        slots,
        balances,
        jsonRpcUrl as string,
        15624161
      );
      sor = await setUp(networkId, provider, [BAL_WETH]);
      await sor.fetchPools();
    });

    it('should join', async () => {
      const swapAmount = parseFixed('7', 18);
      const swapType = SwapTypes.SwapExactIn;
      const swapInfo = await sor.getSwaps(
        tokenIn,
        tokenOut,
        swapType,
        swapAmount,
        undefined,
        true
      );
      expect(someJoinExit(swapInfo.swaps, swapInfo.tokenAddresses)).to.be.true;

      const signerAddr = await signer.getAddress();
      const authorisation = await signRelayerApproval(
        '0x2536dfeeCB7A0397CF98eDaDA8486254533b1aFA',
        signerAddr,
        signer
      );
      const callData = buildCalls(
        tokenIn,
        tokenOut,
        swapInfo,
        signerAddr,
        authorisation
      );

      const [tokenInBalanceBefore, tokenOutBalanceBefore] = await getBalances(
        [tokenIn, tokenOut],
        signer,
        signerAddr
      );
      const gasLimit = MAX_GAS_LIMIT;
      // const tx = await relayerContract.multicall([]);
      const response = await signer.sendTransaction({
        to: callData.to,
        data: callData.data,
        gasLimit,
      });

      const receipt = await response.wait();
      console.log('Gas used', receipt.gasUsed.toString());
      const [tokenInBalanceAfter, tokenOutBalanceAfter] = await getBalances(
        [tokenIn, tokenOut],
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

  context('swap > exit', () => {
    const tokenIn = ADDRESSES[Network.MAINNET].auraBal.address;
    const tokenOut = ADDRESSES[Network.MAINNET].WETH.address;
    // Setup chain
    before(async function () {
      this.timeout(20000);
      const networkId = Network.MAINNET;
      const tokens = [tokenIn];
      const balances = [parseFixed('100', 18).toString()];
      const slots = [ADDRESSES[Network.MAINNET].auraBal.slot];

      await forkSetup(
        signer,
        tokens,
        slots,
        balances,
        jsonRpcUrl as string,
        15624161
      );
      sor = await setUp(networkId, provider, [BAL_WETH, AURA_BAL_STABLE]);
      await sor.fetchPools();
    });

    it('should swap then exit', async () => {
      const swapAmount = parseFixed('7', 18);
      const swapType = SwapTypes.SwapExactIn;
      const swapInfo = await sor.getSwaps(
        tokenIn,
        tokenOut,
        swapType,
        swapAmount,
        undefined,
        true
      );
      expect(someJoinExit(swapInfo.swaps, swapInfo.tokenAddresses)).to.be.true;
      console.log(swapInfo.swaps);
      const signerAddr = await signer.getAddress();
      const authorisation = await signRelayerApproval(
        '0x2536dfeeCB7A0397CF98eDaDA8486254533b1aFA',
        signerAddr,
        signer
      );
      const callData = buildCalls(
        tokenIn,
        tokenOut,
        swapInfo,
        signerAddr,
        authorisation
      );

      const [tokenInBalanceBefore, tokenOutBalanceBefore] = await getBalances(
        [tokenIn, tokenOut],
        signer,
        signerAddr
      );
      const gasLimit = MAX_GAS_LIMIT;
      // const tx = await relayerContract.multicall([]);
      const response = await signer.sendTransaction({
        to: callData.to,
        data: callData.data,
        gasLimit,
      });

      const receipt = await response.wait();
      console.log('Gas used', receipt.gasUsed.toString());
      const [tokenInBalanceAfter, tokenOutBalanceAfter] = await getBalances(
        [tokenIn, tokenOut],
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
});
