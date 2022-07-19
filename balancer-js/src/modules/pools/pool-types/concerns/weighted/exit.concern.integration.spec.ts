import dotenv from 'dotenv';
import { expect } from 'chai';
import {
  BalancerError,
  BalancerErrorCode,
  BalancerSDK,
  Network,
  Pool,
  PoolModel,
  PoolToken,
  StaticPoolRepository,
} from '@/.';
import hardhat from 'hardhat';

import { TransactionReceipt } from '@ethersproject/providers';
import { BigNumber, parseFixed } from '@ethersproject/bignumber';

import { forkSetup } from '@/test/lib/utils';
import pools_14717479 from '@/test/lib/pools_14717479.json';
import { PoolsProvider } from '@/modules/pools/provider';

dotenv.config();

const { ALCHEMY_URL: jsonRpcUrl } = process.env;
const { ethers } = hardhat;

let balancer: BalancerSDK;
const rpcUrl = 'http://127.0.0.1:8545';
const provider = new ethers.providers.JsonRpcProvider(rpcUrl, 1);
const signer = provider.getSigner();

// Slots used to set the account balance for each token through hardhat_setStorageAt
// Info fetched using npm package slot20
const BPT_SLOT = 0;

const initialBalance = '100000';
const amountsOutDiv = '100000000';
const bptIn = parseFixed('10', 18).toString();
const slippage = '100';

let tokensOut: PoolToken[];
let amountsOut: string[];
let transactionReceipt: TransactionReceipt;
let bptBalanceBefore: BigNumber;
let bptBalanceAfter: BigNumber;
let bptMaxBalanceDecrease: BigNumber;
let tokensBalanceBefore: BigNumber[];
let tokensBalanceAfter: BigNumber[];
let tokensMinBalanceIncrease: BigNumber[];
let signerAddress: string;
let pool: PoolModel;

// Setup

const setupPool = async (provider: PoolsProvider, poolId: string) => {
  const _pool = await provider.find(poolId);
  if (!_pool) throw new BalancerError(BalancerErrorCode.POOL_DOESNT_EXIST);
  const pool = _pool;
  return pool;
};

const tokenBalance = async (tokenAddress: string, signerAddress: string) => {
  const balance: Promise<BigNumber> = balancer.contracts
    .ERC20(tokenAddress, signer.provider)
    .balanceOf(signerAddress);
  return balance;
};

const updateBalances = async (pool: Pool) => {
  const bptBalance = tokenBalance(pool.address, signerAddress);
  const balances = [];
  for (let i = 0; i < pool.tokensList.length; i++) {
    balances[i] = tokenBalance(pool.tokensList[i], signerAddress);
  }
  return Promise.all([bptBalance, ...balances]);
};

const testExitPool = (poolId: string) => {
  describe('exit execution', async () => {
    // Setup chain
    before(async function () {
      this.timeout(20000);

      const sdkConfig = {
        network: Network.MAINNET,
        rpcUrl,
      };
      // Using a static repository to make test consistent over time
      const poolsProvider = new PoolsProvider(
        sdkConfig,
        new StaticPoolRepository(pools_14717479 as Pool[])
      );
      balancer = new BalancerSDK(
        sdkConfig,
        undefined,
        undefined,
        undefined,
        poolsProvider
      );
      pool = await setupPool(poolsProvider, poolId);
      tokensOut = pool.tokens;
      await forkSetup(
        balancer,
        signer,
        [pool.address],
        [BPT_SLOT],
        [parseFixed(initialBalance, 18).toString()],
        jsonRpcUrl as string,
        14717479 // holds the same state as the static repository
      );
      signerAddress = await signer.getAddress();
    });

    context('exitExactBPTIn transaction - exit with encoded data', async () => {
      before(async function () {
        this.timeout(20000);
        [bptBalanceBefore, ...tokensBalanceBefore] = await updateBalances(pool);

        const { to, data, minAmountsOut, maxBPTIn } = pool.buildExitExactBPTIn(
          signerAddress,
          bptIn,
          slippage
        );
        const tx = { to, data }; // , gasPrice: '600000000000', gasLimit: '2000000' };

        bptMaxBalanceDecrease = BigNumber.from(maxBPTIn);
        tokensMinBalanceIncrease = minAmountsOut.map((a) => BigNumber.from(a));
        const transactionResponse = await signer.sendTransaction(tx);
        transactionReceipt = await transactionResponse.wait();
        [bptBalanceAfter, ...tokensBalanceAfter] = await updateBalances(pool);
      });

      it('should work', async () => {
        expect(transactionReceipt.status).to.eql(1);
      });

      it('tokens balance should increase', async () => {
        for (let i = 0; i < tokensBalanceAfter.length; i++) {
          expect(
            tokensBalanceAfter[i]
              .sub(tokensBalanceBefore[i])
              .gte(tokensMinBalanceIncrease[i])
          ).to.be.true;
        }
      });

      it('bpt balance should decrease', async () => {
        expect(bptBalanceBefore.sub(bptBalanceAfter).eq(bptMaxBalanceDecrease))
          .to.be.true;
      });
    });

    context('exitExactBPTIn transaction - exit with params', async () => {
      before(async function () {
        this.timeout(20000);
        [bptBalanceBefore, ...tokensBalanceBefore] = await updateBalances(pool);

        const { attributes, minAmountsOut, maxBPTIn } =
          pool.buildExitExactBPTIn(signerAddress, bptIn, slippage);

        bptMaxBalanceDecrease = BigNumber.from(maxBPTIn);
        tokensMinBalanceIncrease = minAmountsOut.map((a) => BigNumber.from(a));

        const transactionResponse = await balancer.contracts.vault
          .connect(signer)
          .exitPool(
            attributes.poolId,
            attributes.sender,
            attributes.recipient,
            attributes.exitPoolRequest
          );
        transactionReceipt = await transactionResponse.wait();
        [bptBalanceAfter, ...tokensBalanceAfter] = await updateBalances(pool);
      });

      it('should work', async () => {
        expect(transactionReceipt.status).to.eql(1);
      });

      it('tokens balance should increase', async () => {
        for (let i = 0; i < tokensBalanceAfter.length; i++) {
          expect(
            tokensBalanceAfter[i]
              .sub(tokensBalanceBefore[i])
              .gte(tokensMinBalanceIncrease[i])
          ).to.be.true;
        }
      });

      it('bpt balance should decrease', async () => {
        expect(bptBalanceBefore.sub(bptBalanceAfter).eq(bptMaxBalanceDecrease))
          .to.be.true;
      });
    });

    context('exitExactTokensOut - exit with encoded data', async () => {
      before(async function () {
        this.timeout(20000);
        [bptBalanceBefore, ...tokensBalanceBefore] = await updateBalances(pool);

        amountsOut = pool.tokens.map((t) =>
          parseFixed(t.balance, t.decimals).div(amountsOutDiv).toString()
        );
        const { to, data, minAmountsOut, maxBPTIn } =
          await pool.buildExitExactTokensOut(
            signerAddress,
            tokensOut.map((t) => t.address),
            amountsOut,
            slippage
          );
        const tx = { to, data }; // , gasPrice: '600000000000', gasLimit: '2000000' };

        bptMaxBalanceDecrease = BigNumber.from(maxBPTIn);
        tokensMinBalanceIncrease = minAmountsOut.map((a) => BigNumber.from(a));
        const transactionResponse = await signer.sendTransaction(tx);
        transactionReceipt = await transactionResponse.wait();
        [bptBalanceAfter, ...tokensBalanceAfter] = await updateBalances(pool);
      });

      it('should work', async () => {
        expect(transactionReceipt.status).to.eql(1);
      });

      it('tokens balance should increase', async () => {
        for (let i = 0; i < tokensBalanceAfter.length; i++) {
          expect(
            tokensBalanceAfter[i]
              .sub(tokensBalanceBefore[i])
              .eq(tokensMinBalanceIncrease[i])
          ).to.be.true;
        }
      });

      it('bpt balance should decrease', async () => {
        expect(bptBalanceBefore.sub(bptBalanceAfter).lte(bptMaxBalanceDecrease))
          .to.be.true;
      });
    });

    context('exitExactTokensOut transaction - exit with params', async () => {
      before(async function () {
        this.timeout(20000);
        [bptBalanceBefore, ...tokensBalanceBefore] = await updateBalances(pool);

        amountsOut = pool.tokens.map((t) =>
          parseFixed(t.balance, t.decimals).div(amountsOutDiv).toString()
        );
        const { attributes, minAmountsOut, maxBPTIn } =
          await pool.buildExitExactTokensOut(
            signerAddress,
            tokensOut.map((t) => t.address),
            amountsOut,
            slippage
          );

        bptMaxBalanceDecrease = BigNumber.from(maxBPTIn);
        tokensMinBalanceIncrease = minAmountsOut.map((a) => BigNumber.from(a));

        const transactionResponse = await balancer.contracts.vault
          .connect(signer)
          .exitPool(
            attributes.poolId,
            attributes.sender,
            attributes.recipient,
            attributes.exitPoolRequest
          );
        transactionReceipt = await transactionResponse.wait();
        [bptBalanceAfter, ...tokensBalanceAfter] = await updateBalances(pool);
      });

      it('should work', async () => {
        expect(transactionReceipt.status).to.eql(1);
      });

      it('tokens balance should increase', async () => {
        for (let i = 0; i < tokensBalanceAfter.length; i++) {
          expect(
            tokensBalanceAfter[i]
              .sub(tokensBalanceBefore[i])
              .eq(tokensMinBalanceIncrease[i])
          ).to.be.true;
        }
      });

      it('bpt balance should decrease', async () => {
        expect(bptBalanceBefore.sub(bptBalanceAfter).lte(bptMaxBalanceDecrease))
          .to.be.true;
      });
    });
  }).timeout(20000);
};

// Test Scenarios

// testExitPool(
//   '0xa6f548df93de924d73be7d25dc02554c6bd66db500020000000000000000000e' // B_50WBTC_50WETH
// );

// testExitPool(
//   '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014' // Balancer 80 BAL 20 WETH
// );

testExitPool(
  '0xc45d42f801105e861e86658648e3678ad7aa70f900010000000000000000011e' // 50OHM-25DAI-25WETH
);
