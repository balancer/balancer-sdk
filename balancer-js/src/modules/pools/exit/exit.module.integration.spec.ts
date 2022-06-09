import dotenv from 'dotenv';
import { expect } from 'chai';
import { Network } from '@/.';
import { MockPoolDataService } from '@/test/lib/mockPool';
import { B_50WBTC_50WETH, getForkedPools } from '@/test/lib/mainnetPools';
import hardhat from 'hardhat';

import { JsonRpcProvider, TransactionReceipt } from '@ethersproject/providers';
import { BigNumber } from 'ethers';
import { parseFixed } from '@ethersproject/bignumber';

import { Pools } from '../pools.module';
import { balancerVault } from '@/lib/constants/config';

dotenv.config();

const { ALCHEMY_URL: jsonRpcUrl } = process.env;
const { ethers } = hardhat;

const getERC20Contract = (address: string) => {
  return new ethers.Contract(
    address,
    ['function balanceOf(address) view returns (uint256)'],
    provider
  );
};

const rpcUrl = 'http://127.0.0.1:8545';
const provider = new ethers.providers.JsonRpcProvider(rpcUrl, 1);
const signer = provider.getSigner();

const wETH = B_50WBTC_50WETH.tokens[0];
const wBTC = B_50WBTC_50WETH.tokens[1];

// Slots used to set the account balance for each token through hardhat_setStorageAt
// Info fetched using npm package slot20
const BPT_SLOT = 0;

// Setup

const setupTokenBalance = async (
  signerAddress: string,
  tokenAddress: string,
  slot: number
) => {
  const toBytes32 = (bn: BigNumber) => {
    return ethers.utils.hexlify(ethers.utils.zeroPad(bn.toHexString(), 32));
  };

  const setStorageAt = async (
    tokenAddress: string,
    index: string,
    value: string
  ) => {
    await provider.send('hardhat_setStorageAt', [tokenAddress, index, value]);
    await provider.send('evm_mine', []); // Just mines to the next block
  };

  const locallyManipulatedBalance = parseFixed('100000', 18);

  // Get storage slot index
  const index = ethers.utils.solidityKeccak256(
    ['uint256', 'uint256'],
    [signerAddress, slot] // key, slot
  );

  // Manipulate local balance (needs to be bytes32 string)
  await setStorageAt(
    tokenAddress,
    index,
    toBytes32(locallyManipulatedBalance).toString()
  );
};

const setupPoolsModule = async (provider: JsonRpcProvider) => {
  const pools = await getForkedPools(provider);
  const poolsModule = new Pools({
    network: Network.MAINNET,
    rpcUrl,
    sor: {
      tokenPriceService: 'coingecko',
      poolDataService: new MockPoolDataService(pools),
      fetchOnChainBalances: true,
    },
  });
  await poolsModule.fetchPools();
  return poolsModule;
};

// Test scenarios

describe('exit pool execution', async () => {
  let poolsModule: Pools;
  let transactionReceipt: TransactionReceipt;
  let tokensBalanceBefore: BigNumber[];
  let tokensBalanceIncrease: BigNumber[];
  let signerAddress: string;
  const wETHContract = getERC20Contract(wETH.address);
  const wBTCContract = getERC20Contract(wBTC.address);

  // Setup chain
  before(async function () {
    this.timeout(20000);

    await provider.send('hardhat_reset', [
      {
        forking: {
          jsonRpcUrl,
        },
      },
    ]);
    poolsModule = await setupPoolsModule(provider);
    signerAddress = await signer.getAddress();
    await setupTokenBalance(signerAddress, B_50WBTC_50WETH.address, BPT_SLOT);
  });

  context('exitExactBPTInForTokensOut transaction', () => {
    before(async function () {
      this.timeout(20000);

      const wETHBalanceBefore = await wETHContract.balanceOf(signerAddress);
      const wBTCBalanceBefore = await wBTCContract.balanceOf(signerAddress);
      tokensBalanceBefore = [wETHBalanceBefore, wBTCBalanceBefore];

      const bptIn = '0.001';
      const slippage = '0.1';
      const { data } = await poolsModule.exit.buildExitExactBPTInForTokensOut(
        signerAddress,
        B_50WBTC_50WETH.id,
        bptIn,
        slippage
      );
      const to = balancerVault;
      const tx = { data, to, gasPrice: '600000000000', gasLimit: '2000000' };

      tokensBalanceIncrease = [
        BigNumber.from('2082313995603838'),
        BigNumber.from('12406'),
      ]; // get from amountsOut value (after adapting function to return transaction attributes)
      transactionReceipt = await (await signer.sendTransaction(tx)).wait();
    });

    it('should work', async () => {
      expect(transactionReceipt.status).to.eql(1);
    });

    it('balance should increase', async () => {
      const wETHBalanceAfter: BigNumber = await wETHContract.balanceOf(
        signerAddress
      );
      const wBTCBalanceAfter: BigNumber = await wBTCContract.balanceOf(
        signerAddress
      );
      const tokensBalanceAfter = [wETHBalanceAfter, wBTCBalanceAfter];

      for (let i = 0; i < tokensBalanceAfter.length; i++) {
        expect(
          tokensBalanceAfter[i].sub(tokensBalanceBefore[i]).toNumber()
        ).to.eql(tokensBalanceIncrease[i].toNumber());
      }
    });
  });
}).timeout(20000);
