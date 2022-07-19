/* eslint-disable no-unexpected-multiline */
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
import { parseFixed, BigNumber } from '@ethersproject/bignumber';
import { AddressZero } from '@ethersproject/constants';

import { ADDRESSES } from '@/test/lib/constants';
import { forkSetup } from '@/test/lib/utils';
import pools_14717479 from '@/test/lib/pools_14717479.json';
import { PoolsProvider } from '@/modules/pools/provider';

dotenv.config();

const { ALCHEMY_URL: jsonRpcUrl } = process.env;
const { ethers } = hardhat;

let balancer: BalancerSDK;
const network = Network.MAINNET;
const rpcUrl = 'http://127.0.0.1:8545';
const sdkConfig = {
  network,
  rpcUrl,
};
const provider = new ethers.providers.JsonRpcProvider(rpcUrl, 1);
const signer = provider.getSigner();
let signerAddress: string;

// Slots used to set the account balance for each token through hardhat_setStorageAt
// Info fetched using npm package slot20
const slots = [
  ADDRESSES[network].DAI.slot,
  ADDRESSES[network].USDC.slot,
  ADDRESSES[network].USDT.slot,
];

const initialBalance = '100000';
const amountsInDiv = '100000'; // TODO: setting amountsInDiv to 1000 will fail test due to stable math convergence issue - check if that's expected from maths

let tokensIn: PoolToken[];
let amountsIn: string[];

// Setup

const setupPool = async (provider: PoolsProvider, poolId: string) => {
  const _pool = await provider.find(poolId);
  if (!_pool) throw new BalancerError(BalancerErrorCode.POOL_DOESNT_EXIST);
  const pool = _pool;
  return pool;
};

const tokenBalance = async (tokenAddress: string) => {
  if (tokenAddress === AddressZero) return await signer.getBalance();
  const balance: Promise<BigNumber> = balancer.contracts
    .ERC20(tokenAddress, signer.provider)
    .balanceOf(signerAddress);
  return balance;
};

const updateBalances = async (pool: Pool) => {
  const bptBalance = tokenBalance(pool.address);
  const balances = [];
  for (let i = 0; i < pool.tokensList.length; i++) {
    balances[i] = tokenBalance(pool.tokensList[i]);
  }
  return Promise.all([bptBalance, ...balances]);
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
    pool = await setupPool(
      poolsProvider,
      '0x06df3b2bbb68adc8b0e302443692037ed9f91b42000000000000000000000063' // Balancer USD Stable Pool - staBAL3
    );
    tokensIn = pool.tokens;
    const balances = pool.tokens.map((token) =>
      parseFixed(initialBalance, token.decimals).toString()
    );
    await forkSetup(
      balancer,
      signer,
      tokensIn.map((t) => t.address),
      slots,
      balances,
      jsonRpcUrl as string,
      14717479 // holds the same state as the static repository
    );
    signerAddress = await signer.getAddress();
  });

  context('join transaction - join with encoded data', () => {
    before(async function () {
      this.timeout(20000);
      amountsIn = tokensIn.map((t) =>
        parseFixed(t.balance, t.decimals).div(amountsInDiv).toString()
      );

      [bptBalanceBefore, ...tokensBalanceBefore] = await updateBalances(pool);

      const slippage = '1';

      const { to, data, minBPTOut } = pool.buildJoin(
        signerAddress,
        tokensIn.map((t) => t.address),
        amountsIn,
        slippage
      );
      const tx = { to, data };

      bptMinBalanceIncrease = BigNumber.from(minBPTOut);
      transactionReceipt = await (await signer.sendTransaction(tx)).wait();
      [bptBalanceAfter, ...tokensBalanceAfter] = await updateBalances(pool);
    });

    it('should work', async () => {
      expect(transactionReceipt.status).to.eql(1);
    });

    it('should increase BPT balance', async () => {
      expect(bptBalanceAfter.sub(bptBalanceBefore).gte(bptMinBalanceIncrease))
        .to.be.true;
    });

    it('should decrease tokens balance', async () => {
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

      [bptBalanceBefore, ...tokensBalanceBefore] = await updateBalances(pool);

      const slippage = '100';
      const { functionName, attributes, value, minBPTOut } = pool.buildJoin(
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
      [bptBalanceAfter, ...tokensBalanceAfter] = await updateBalances(pool);
    });

    it('should work', async () => {
      expect(transactionReceipt.status).to.eql(1);
    });

    it('should increase BPT balance', async () => {
      expect(bptBalanceAfter.sub(bptBalanceBefore).gte(bptMinBalanceIncrease))
        .to.be.true;
    });

    it('should decrease tokens balance', async () => {
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
        parseFixed(tokensIn[0].balance, tokensIn[0].decimals)
          .div('100')
          .toString(),
      ];
    });

    it('should fail on number of input tokens', async () => {
      const slippage = '10';
      let errorMessage;
      try {
        pool.buildJoin(
          signerAddress,
          tokensIn.map((t) => t.address),
          amountsIn,
          slippage
        );
      } catch (error) {
        errorMessage = (error as Error).message;
      }
      expect(errorMessage).to.contain(
        BalancerError.getMessage(BalancerErrorCode.INPUT_LENGTH_MISMATCH)
      );
    });
  });
}).timeout(20000);
