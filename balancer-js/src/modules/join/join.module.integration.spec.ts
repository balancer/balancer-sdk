/* eslint-disable no-unexpected-multiline */
import dotenv from 'dotenv';
import { expect } from 'chai';
import { BalancerSDK, Network, PoolModel, PoolToken } from '@/.';
import hardhat from 'hardhat';

import { TransactionReceipt } from '@ethersproject/providers';
import { parseFixed, BigNumber } from '@ethersproject/bignumber';

import { AddressZero } from '@ethersproject/constants';

import { setTokenBalance, approveToken } from '@/test/lib/utils';

dotenv.config();

const { ALCHEMY_URL: jsonRpcUrl } = process.env;
const { ethers } = hardhat;

let balancer: BalancerSDK;
const rpcUrl = 'http://127.0.0.1:8545';
const provider = new ethers.providers.JsonRpcProvider(rpcUrl, 1);
const signer = provider.getSigner();
let signerAddress: string;

// Slots used to set the account balance for each token through hardhat_setStorageAt
// Info fetched using npm package slot20
const wBTC_SLOT = 0;
const wETH_SLOT = 3;
const slots = [wBTC_SLOT, wETH_SLOT];

const initialBalance = '100000';
const amountsInDiv = '100000000';

let tokensIn: PoolToken[];
let amountsIn: string[];

// Setup

const setupPool = async () => {
  const sdkConfig = {
    network: Network.MAINNET,
    rpcUrl,
  };
  balancer = new BalancerSDK(sdkConfig);
  const _pool = await balancer.poolsProvider.find(
    '0xa6f548df93de924d73be7d25dc02554c6bd66db500020000000000000000000e' // B_50WBTC_50WETH
  );
  if (!_pool) throw new Error('Pool not found');
  const pool = _pool;
  tokensIn = pool.tokens;
  return pool;
};

const tokenBalance = async (tokenAddress: string) => {
  const balance: Promise<BigNumber> = balancer.contracts
    .ERC20(tokenAddress, signer.provider)
    .balanceOf(signerAddress);
  return balance;
};

// Test scenarios

describe('join execution', async () => {
  let transactionReceipt: TransactionReceipt;
  let bptBalanceBefore: BigNumber;
  let bptMinBalanceIncrease: BigNumber;
  let bptBalanceAfter: BigNumber;
  let tokensBalanceBefore: BigNumber[];
  let tokensBalanceAfter: BigNumber[];
  let pool: PoolModel;

  // Setup chain
  before(async function () {
    this.timeout(20000);

    await provider.send('hardhat_reset', [
      {
        forking: {
          jsonRpcUrl,
          blockNumber: 14717479, // holds same state static repository
        },
      },
    ]);
    pool = await setupPool();
    signerAddress = await signer.getAddress();
    for (let i = 0; i < tokensIn.length; i++) {
      const token = tokensIn[i];
      const balance = parseFixed(initialBalance, token.decimals).toString();
      await setTokenBalance(signer, token.address, slots[i], balance);
      await approveToken(balancer, token.address, balance, signer);
    }
  });

  context('join transaction - join with encoded data', () => {
    before(async function () {
      this.timeout(20000);
      amountsIn = tokensIn.map((t) =>
        parseFixed(t.balance, t.decimals).div(amountsInDiv).toString()
      );

      bptBalanceBefore = await tokenBalance(pool.address);
      tokensBalanceBefore = [
        await tokenBalance(tokensIn[0].address),
        await tokenBalance(tokensIn[1].address),
      ];

      const slippage = '100';

      const { to, data, minBPTOut } = await pool.buildJoin(
        signerAddress,
        tokensIn.map((t) => t.address),
        amountsIn,
        slippage
      );
      const tx = { to, data };

      bptMinBalanceIncrease = BigNumber.from(minBPTOut);
      transactionReceipt = await (await signer.sendTransaction(tx)).wait();
    });

    it('should work', async () => {
      expect(transactionReceipt.status).to.eql(1);
    });

    it('should increase BPT balance', async () => {
      bptBalanceAfter = await tokenBalance(pool.address);

      expect(
        bptBalanceAfter.sub(bptBalanceBefore).toNumber()
      ).to.greaterThanOrEqual(bptMinBalanceIncrease.toNumber());
    });

    it('should decrease tokens balance', async () => {
      tokensBalanceAfter = [
        await tokenBalance(tokensIn[0].address),
        await tokenBalance(tokensIn[1].address),
      ];

      for (let i = 0; i < tokensIn.length; i++) {
        expect(
          tokensBalanceBefore[i].sub(tokensBalanceAfter[i]).toString()
        ).to.equal(amountsIn[i]);
      }
    });
  });

  context('join transaction - join with params', () => {
    before(async function () {
      this.timeout(20000);

      amountsIn = tokensIn.map((t) =>
        parseFixed(t.balance, t.decimals).div(amountsInDiv).toString()
      );

      bptBalanceBefore = await tokenBalance(pool.address);
      tokensBalanceBefore = [
        await tokenBalance(tokensIn[0].address),
        await tokenBalance(tokensIn[1].address),
      ];

      const slippage = '100';
      const { functionName, attributes, value, minBPTOut } =
        await pool.buildJoin(
          signerAddress,
          tokensIn.map((t) => t.address),
          amountsIn,
          slippage
        );
      const transactionResponse = await balancer.contracts.vault
        .connect(signer)
        [functionName](...Object.values(attributes), { value });
      transactionReceipt = await transactionResponse.wait();

      bptMinBalanceIncrease = BigNumber.from(minBPTOut);
    });

    it('should work', async () => {
      expect(transactionReceipt.status).to.eql(1);
    });

    it('should increase BPT balance', async () => {
      bptBalanceAfter = await tokenBalance(pool.address);

      expect(
        bptBalanceAfter.sub(bptBalanceBefore).toNumber()
      ).to.greaterThanOrEqual(bptMinBalanceIncrease.toNumber());
    });

    it('should decrease tokens balance', async () => {
      tokensBalanceAfter = [
        await tokenBalance(tokensIn[0].address),
        await tokenBalance(tokensIn[1].address),
      ];

      for (let i = 0; i < tokensIn.length; i++) {
        expect(
          tokensBalanceBefore[i].sub(tokensBalanceAfter[i]).toString()
        ).to.equal(amountsIn[i]);
      }
    });
  });

  context('join transaction - join with ETH', () => {
    let transactionCost: BigNumber;
    before(async function () {
      this.timeout(20000);

      amountsIn = tokensIn.map((t) =>
        parseFixed(t.balance, t.decimals).div(amountsInDiv).toString()
      );

      bptBalanceBefore = await tokenBalance(pool.address);
      tokensBalanceBefore = [
        await tokenBalance(tokensIn[0].address),
        await signer.getBalance(),
      ];

      const slippage = '100';
      const { to, data, value, minBPTOut } = await pool.buildJoin(
        signerAddress,
        [tokensIn[0].address, AddressZero],
        amountsIn,
        slippage
      );
      const tx = { to, data, value };

      bptMinBalanceIncrease = BigNumber.from(minBPTOut);
      transactionReceipt = await (await signer.sendTransaction(tx)).wait();
      transactionCost = transactionReceipt.gasUsed.mul(
        transactionReceipt.effectiveGasPrice
      );
    });

    it('should work', async () => {
      expect(transactionReceipt.status).to.eql(1);
    });

    it('should increase BPT balance', async () => {
      bptBalanceAfter = await tokenBalance(pool.address);

      expect(
        bptBalanceAfter.sub(bptBalanceBefore).toNumber()
      ).to.greaterThanOrEqual(bptMinBalanceIncrease.toNumber());
    });

    it('should decrease tokens balance', async () => {
      tokensBalanceAfter = [
        await tokenBalance(tokensIn[0].address),
        await (await signer.getBalance()).add(transactionCost),
      ];

      for (let i = 0; i < tokensIn.length; i++) {
        expect(
          tokensBalanceBefore[i].sub(tokensBalanceAfter[i]).toString()
        ).to.equal(amountsIn[i]);
      }
    });
  });

  context('join transaction - single token join', () => {
    before(async function () {
      this.timeout(20000);
      amountsIn = [
        parseFixed(tokensIn[1].balance, tokensIn[1].decimals)
          .div('100')
          .toString(),
      ];
    });

    it('should fail on number of input tokens', async () => {
      const slippage = '10';
      let errorMessage;
      try {
        await pool.buildJoin(
          signerAddress,
          tokensIn.map((t) => t.address),
          amountsIn,
          slippage
        );
      } catch (error) {
        errorMessage = (error as Error).message;
      }
      expect(errorMessage).to.contain(
        'Must provide amount for all tokens in the pool'
      );
    });
  });
}).timeout(20000);
