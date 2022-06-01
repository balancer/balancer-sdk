import dotenv from 'dotenv';
import { expect } from 'chai';
import { Network, Swaps } from '@/.';
import { MockPoolDataService } from '@/test/lib/mockPool';
import { AddressZero, MaxUint256 } from '@ethersproject/constants';
import { SwapInfo } from '@balancer-labs/sor';
import hardhat from 'hardhat';
import { JsonRpcProvider, TransactionReceipt } from '@ethersproject/providers';
import { BigNumber } from 'ethers';
import { getForkedPools } from '@/test/lib/mainnetPools';

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

const setupSwaps = async (provider: JsonRpcProvider) => {
  const pools = await getForkedPools(provider);

  const swaps = new Swaps({
    network: Network.MAINNET,
    rpcUrl,
    sor: {
      tokenPriceService: 'coingecko',
      poolDataService: new MockPoolDataService(pools),
      fetchOnChainBalances: true,
    },
  });

  await swaps.fetchPools();

  return swaps;
};

const tokenIn = AddressZero; // ETH
const tokenOut = '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599'; // wBTC
const amount = ethers.utils.parseEther('1');
const gasPrice = ethers.utils.parseUnits('1', 'gwei'); // not important
const maxPools = 4;
const deadline = MaxUint256;
const maxSlippage = 1;

describe('swaps execution', async () => {
  let swaps: Swaps;
  let transactionReceipt: TransactionReceipt;
  let balanceBefore: BigNumber;
  let balanceExpected: BigNumber;
  const tokenOutContract = getERC20Contract(tokenOut);

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

    swaps = await setupSwaps(provider);
  });

  context('single transaction', () => {
    before(async function () {
      this.timeout(20000);

      balanceBefore = await tokenOutContract.balanceOf(
        await signer.getAddress()
      );

      const swapInfo: SwapInfo = await swaps.findRouteGivenIn({
        tokenIn,
        tokenOut,
        amount,
        gasPrice,
        maxPools,
      });

      const { to, data, value } = swaps.buildSwap({
        userAddress: await signer.getAddress(),
        swapInfo,
        kind: 0,
        deadline,
        maxSlippage,
      });

      const tx = { to, data, value };

      balanceExpected = swapInfo.returnAmount;
      transactionReceipt = await (await signer.sendTransaction(tx)).wait();
    });

    it('should work', async () => {
      expect(transactionReceipt.status).to.eql(1);
    });

    it('balance should increase', async () => {
      const balanceAfter: BigNumber = await tokenOutContract.balanceOf(
        await signer.getAddress()
      );

      expect(balanceAfter.sub(balanceBefore).toNumber()).to.eql(
        balanceExpected.toNumber()
      );
    });
  });

  context('in mempool', () => {
    before(async () => {
      await provider.send('evm_setAutomine', [false]);
    });

    after(async () => {
      await provider.send('evm_setAutomine', [true]);
    });

    context('in mempool', () => {
      const getTx = async (amount: BigNumber, userAddress: string) => {
        const swapInfo: SwapInfo = await swaps.findRouteGivenIn({
          tokenIn,
          tokenOut,
          amount,
          gasPrice,
          maxPools,
        });

        const { to, data, value } = swaps.buildSwap({
          userAddress,
          swapInfo,
          kind: 0,
          deadline,
          maxSlippage,
        });

        return { to, data, value };
      };

      before(async () => {
        await provider.send('evm_setAutomine', [false]);
      });

      after(async () => {
        await provider.send('evm_setAutomine', [true]);
      });

      it('fails on slippage', async () => {
        const frontrunner = provider.getSigner(1);
        const frTx = await getTx(
          ethers.utils.parseEther('100'),
          await frontrunner.getAddress()
        );
        const userTx = await getTx(
          ethers.utils.parseEther('1'),
          await signer.getAddress()
        );

        await frontrunner.sendTransaction(frTx);

        let reason;
        try {
          await signer.sendTransaction(userTx);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
          // Slippage should trigger 507 error:
          // https://github.com/balancer-labs/balancer-v2-monorepo/blob/master/pkg/solidity-utils/contracts/helpers/BalancerErrors.sol#L218
          reason = err.reason;
        }

        expect(reason).to.contain('BAL#507');

        await provider.send('evm_mine', []);
      });
    });
  });
}).timeout(20000);
