import dotenv from 'dotenv';
import { expect } from 'chai';
import { Network, Swaps } from '@/.';
import { MockPoolDataService } from '@/test/lib/mockPool';
import { AddressZero, MaxUint256 } from '@ethersproject/constants';
import { SwapInfo } from '@balancer-labs/sor';
import hardhat from 'hardhat';
import { JsonRpcProvider, TransactionReceipt } from '@ethersproject/providers';
import { BigNumber } from '@ethersproject/bignumber';
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
const recipient = provider.getSigner(1);

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
const deadline = MaxUint256.toString();
const maxSlippage = 1;

describe('swaps execution', async () => {
  let swaps: Swaps;
  let transactionReceipt: TransactionReceipt;
  let inBalanceBeforeSigner: BigNumber;
  let outBalanceBeforeSigner: BigNumber;
  let outBalanceBeforeRecipient: BigNumber;
  let outBalanceExpected: BigNumber;
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

  context('ExactIn', () => {
    context('same receiver as signer', () => {
      before(async function () {
        this.timeout(20000);
        inBalanceBeforeSigner = await signer.getBalance();
        outBalanceBeforeSigner = await tokenOutContract.balanceOf(
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

        outBalanceExpected = swapInfo.returnAmount;
        transactionReceipt = await (await signer.sendTransaction(tx)).wait();
      });

      it('should work', async () => {
        expect(transactionReceipt.status).to.eql(1);
      });

      it('tokenIn balance should decrease', async () => {
        const balanceAfter: BigNumber = await signer.getBalance();
        const txFee = transactionReceipt.gasUsed.mul(
          transactionReceipt.effectiveGasPrice
        );
        expect(
          inBalanceBeforeSigner.sub(balanceAfter).sub(txFee).toString()
        ).to.equal(amount.toString());
      });

      it('tokenOut balance should increase', async () => {
        const balanceAfter: BigNumber = await tokenOutContract.balanceOf(
          await signer.getAddress()
        );

        expect(balanceAfter.sub(outBalanceBeforeSigner).toNumber()).to.eql(
          outBalanceExpected.toNumber()
        );
      });
    });

    context('different receiver', () => {
      before(async function () {
        this.timeout(20000);
        await provider.send('hardhat_reset', [
          {
            forking: {
              jsonRpcUrl,
            },
          },
        ]);

        inBalanceBeforeSigner = await signer.getBalance();
        outBalanceBeforeSigner = await tokenOutContract.balanceOf(
          await signer.getAddress()
        );
        outBalanceBeforeRecipient = await tokenOutContract.balanceOf(
          await recipient.getAddress()
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
          recipient: await recipient.getAddress(),
          swapInfo,
          kind: 0,
          deadline,
          maxSlippage,
        });

        const tx = { to, data, value };

        outBalanceExpected = swapInfo.returnAmount;
        transactionReceipt = await (await signer.sendTransaction(tx)).wait();
      });

      it('should work', async () => {
        expect(transactionReceipt.status).to.eql(1);
      });

      it('singer tokenIn balance should decrease', async () => {
        const balanceAfter: BigNumber = await signer.getBalance();
        const txFee = transactionReceipt.gasUsed.mul(
          transactionReceipt.effectiveGasPrice
        );
        expect(
          inBalanceBeforeSigner.sub(balanceAfter).sub(txFee).toString()
        ).to.equal(amount.toString());
      });

      it('signer tokenOut balance shouldnt change', async () => {
        const balanceAfter: BigNumber = await tokenOutContract.balanceOf(
          await signer.getAddress()
        );
        expect(balanceAfter.toString()).to.eql(
          outBalanceBeforeSigner.toString()
        );
      });

      it('recipient tokenOut balance should increase', async () => {
        const balanceAfter: BigNumber = await tokenOutContract.balanceOf(
          await recipient.getAddress()
        );

        expect(balanceAfter.sub(outBalanceBeforeRecipient).toNumber()).to.eql(
          outBalanceExpected.toNumber()
        );
      });
    });
  });

  context('ExactOut', () => {
    const amountOut = ethers.utils.parseUnits('0.001', 8);
    let expectedAmtIn: BigNumber;
    context('same receiver as signer', () => {
      before(async function () {
        this.timeout(20000);
        await provider.send('hardhat_reset', [
          {
            forking: {
              jsonRpcUrl,
            },
          },
        ]);
        inBalanceBeforeSigner = await signer.getBalance();
        outBalanceBeforeSigner = await tokenOutContract.balanceOf(
          await signer.getAddress()
        );

        const swapInfo: SwapInfo = await swaps.findRouteGivenOut({
          tokenIn,
          tokenOut,
          amount: amountOut,
          gasPrice,
          maxPools,
        });

        const { to, data, value } = swaps.buildSwap({
          userAddress: await signer.getAddress(),
          swapInfo,
          kind: 1,
          deadline,
          maxSlippage,
        });

        const tx = { to, data, value };
        transactionReceipt = await (await signer.sendTransaction(tx)).wait();

        expectedAmtIn = swapInfo.returnAmount;
      });

      it('should work', async () => {
        expect(transactionReceipt.status).to.eql(1);
      });

      it('tokenIn balance should decrease', async () => {
        const balanceAfter: BigNumber = await signer.getBalance();
        const txFee = transactionReceipt.gasUsed.mul(
          transactionReceipt.effectiveGasPrice
        );
        expect(
          inBalanceBeforeSigner.sub(balanceAfter).sub(txFee).toString()
        ).to.equal(expectedAmtIn.toString());
      });

      it('tokenOut balance should increase', async () => {
        const balanceAfter: BigNumber = await tokenOutContract.balanceOf(
          await signer.getAddress()
        );
        expect(balanceAfter.sub(outBalanceBeforeSigner).toString()).to.eql(
          amountOut.toString()
        );
      });
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
