/* eslint-disable no-unexpected-multiline */
import dotenv from 'dotenv';
import { expect } from 'chai';
import {
  BalancerError,
  BalancerErrorCode,
  BalancerSDK,
  Network,
  Pool,
} from '@/.';
import hardhat from 'hardhat';

import { TransactionReceipt } from '@ethersproject/providers';
import { parseFixed, BigNumber } from '@ethersproject/bignumber';
import { AddressZero } from '@ethersproject/constants';

import { forkSetup, getBalances } from '@/test/lib/utils';
import pools_14717479 from '@/test/lib/pools_14717479.json';
import { Pools } from '../../../';

dotenv.config();

const { ALCHEMY_URL: jsonRpcUrl } = process.env;
const { ethers } = hardhat;

const rpcUrl = 'http://127.0.0.1:8545';
const network = Network.MAINNET;
const sdk = new BalancerSDK({ network, rpcUrl });
const { networkConfig } = sdk;

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

let amountsIn: string[];
// Test scenarios

const pool = pools_14717479.find(
  (pool) =>
    pool.id ==
    '0xa6f548df93de924d73be7d25dc02554c6bd66db500020000000000000000000e' // B_50WBTC_50WETH
) as unknown as Pool;
const tokensIn = pool.tokens;

const controller = Pools.wrap(pool, networkConfig);

describe('join execution', async () => {
  let transactionReceipt: TransactionReceipt;
  let bptBalanceBefore: BigNumber;
  let bptMinBalanceIncrease: BigNumber;
  let bptBalanceAfter: BigNumber;
  let tokensBalanceBefore: BigNumber[];
  let tokensBalanceAfter: BigNumber[];

  // Setup chain
  before(async function () {
    this.timeout(20000);
    const balances = tokensIn.map((token) =>
      parseFixed(initialBalance, token.decimals).toString()
    );
    await forkSetup(
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

      [bptBalanceBefore, ...tokensBalanceBefore] = await getBalances(
        [pool.address, ...pool.tokensList],
        signer,
        signerAddress
      );

      const slippage = '1';

      const { to, data, minBPTOut } = controller.buildJoin(
        signerAddress,
        tokensIn.map((t) => t.address),
        amountsIn,
        slippage
      );

      const tx = { to, data };

      bptMinBalanceIncrease = BigNumber.from(minBPTOut);
      transactionReceipt = await (await signer.sendTransaction(tx)).wait();
      [bptBalanceAfter, ...tokensBalanceAfter] = await getBalances(
        [pool.address, ...pool.tokensList],
        signer,
        signerAddress
      );
    });

    it('should work', async () => {
      expect(transactionReceipt.status).to.eql(1);
    });

    it('price impact calculation', async () => {
      const minBPTOut = bptMinBalanceIncrease.toString();
      const priceImpact = await controller.calcPriceImpact(
        amountsIn,
        minBPTOut,
        true
      );
      expect(priceImpact).to.eq('102055375201527');
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

  context('join transaction - join with ETH', () => {
    let transactionCost: BigNumber;
    before(async function () {
      this.timeout(20000);

      amountsIn = tokensIn.map((t) =>
        parseFixed(t.balance, t.decimals).div(amountsInDiv).toString()
      );

      const tokensWithETH = tokensIn.map((t) => {
        if (t.address === networkConfig.addresses.tokens.wrappedNativeAsset)
          return AddressZero;
        return t.address;
      });

      [bptBalanceBefore, ...tokensBalanceBefore] = await getBalances(
        [pool.address, ...tokensWithETH],
        signer,
        signerAddress
      );

      const slippage = '100';
      const { to, data, value, minBPTOut } = controller.buildJoin(
        signerAddress,
        tokensWithETH,
        amountsIn,
        slippage
      );
      const tx = { to, data, value };

      bptMinBalanceIncrease = BigNumber.from(minBPTOut);
      transactionReceipt = await (await signer.sendTransaction(tx)).wait();
      transactionCost = transactionReceipt.gasUsed.mul(
        transactionReceipt.effectiveGasPrice
      );

      [bptBalanceAfter, ...tokensBalanceAfter] = await getBalances(
        [pool.address, ...tokensWithETH],
        signer,
        signerAddress
      );
      tokensWithETH.map((t, i) => {
        if (t === AddressZero) {
          tokensBalanceAfter[i] = tokensBalanceAfter[i].add(transactionCost);
        }
      });
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
        controller.buildJoin(
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
