import dotenv from 'dotenv';
import { expect } from 'chai';
import {
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
import { forkSetup, setupPool, getBalances } from '@/test/lib/utils';
import { PoolsProvider } from '@/modules/pools/provider';

import pools_14717479 from '@/test/lib/pools_14717479.json';
import { ExitPoolAttributes } from '../types';
import { AddressZero } from '@ethersproject/constants';

dotenv.config();

const { ALCHEMY_URL: jsonRpcUrl } = process.env;
const { ethers } = hardhat;

let balancer: BalancerSDK;
const rpcUrl = 'http://127.0.0.1:8545';
const network = Network.MAINNET;
const provider = new ethers.providers.JsonRpcProvider(rpcUrl, network);
const signer = provider.getSigner();

// Slots used to set the account balance for each token through hardhat_setStorageAt
// Info fetched using npm package slot20
const BPT_SLOT = 0;
const initialBalance = '100000';
const amountsOutDiv = '1000000000';
const slippage = '100';
const poolId =
  '0x06df3b2bbb68adc8b0e302443692037ed9f91b42000000000000000000000063'; // Balancer USD Stable Pool - staBAL3

let tokensOut: PoolToken[];
let amountsOut: string[];
let transactionReceipt: TransactionReceipt;
let bptBalanceBefore: BigNumber;
let bptBalanceAfter: BigNumber;
let bptMaxBalanceDecrease: BigNumber;
let tokensBalanceBefore: BigNumber[];
let tokensBalanceAfter: BigNumber[];
let tokensMinBalanceIncrease: BigNumber[];
let transactionCost: BigNumber;
let signerAddress: string;
let pool: PoolModel;

describe('exit execution', async () => {
  // Setup chain
  before(async function () {
    this.timeout(20000);

    const sdkConfig = {
      network,
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

  const testFlow = async (
    { to, data, maxBPTIn, minAmountsOut }: ExitPoolAttributes,
    exitTokens: string[],
    exitWithETH = false
  ) => {
    // Check balances before transaction to confirm success
    [bptBalanceBefore, ...tokensBalanceBefore] = await getBalances(
      [pool.address, ...exitTokens],
      signer,
      signerAddress
    );

    // Get expected balances out of transaction
    bptMaxBalanceDecrease = BigNumber.from(maxBPTIn);
    tokensMinBalanceIncrease = minAmountsOut.map((a) => BigNumber.from(a));

    // Send transaction to local fork
    const transactionResponse = await signer.sendTransaction({ to, data });
    transactionReceipt = await transactionResponse.wait();

    // Check balances after transaction to confirm success
    [bptBalanceAfter, ...tokensBalanceAfter] = await getBalances(
      [pool.address, ...exitTokens],
      signer,
      signerAddress
    );

    // add transaction cost to ETH balance when exiting with ETH
    if (exitWithETH) {
      transactionCost = transactionReceipt.gasUsed.mul(
        transactionReceipt.effectiveGasPrice
      );
      tokensBalanceAfter = tokensBalanceAfter.map((balance, i) => {
        if (
          pool.tokensList[i] ===
          balancer.networkConfig.addresses.tokens.wrappedNativeAsset.toLowerCase()
        ) {
          return balance.add(transactionCost);
        }
        return balance;
      });
    }
  };

  context('exitExactBPTIn', async () => {
    before(async function () {
      this.timeout(20000);
      const bptIn = parseFixed('10', 18).toString();
      await testFlow(
        pool.buildExitExactBPTIn(signerAddress, bptIn, slippage),
        pool.tokensList
      );
    });

    it('should work', async () => {
      expect(transactionReceipt.status).to.eql(1);
    });

    it('tokens balance should increase by at least minAmountsOut', async () => {
      for (let i = 0; i < tokensBalanceAfter.length; i++) {
        expect(
          tokensBalanceAfter[i]
            .sub(tokensBalanceBefore[i])
            .gte(tokensMinBalanceIncrease[i])
        ).to.be.true;
      }
    });

    it('bpt balance should decrease by exact bptMaxBalanceDecrease', async () => {
      expect(bptBalanceBefore.sub(bptBalanceAfter).eq(bptMaxBalanceDecrease)).to
        .be.true;
    });
  });

  context('exitExactTokensOut', async () => {
    before(async function () {
      amountsOut = pool.tokens.map((t) =>
        parseFixed(t.balance, t.decimals).div(amountsOutDiv).toString()
      );

      await testFlow(
        pool.buildExitExactTokensOut(
          signerAddress,
          tokensOut.map((t) => t.address),
          amountsOut,
          slippage
        ),
        pool.tokensList
      );
    });

    it('should work', async () => {
      expect(transactionReceipt.status).to.eql(1);
    });

    it('tokens balance should increase by exact amountsOut', async () => {
      for (let i = 0; i < tokensBalanceAfter.length; i++) {
        expect(
          tokensBalanceAfter[i]
            .sub(tokensBalanceBefore[i])
            .eq(tokensMinBalanceIncrease[i])
        ).to.be.true;
      }
    });

    it('bpt balance should decrease by max bptMaxBalanceDecrease', async () => {
      expect(bptBalanceBefore.sub(bptBalanceAfter).lte(bptMaxBalanceDecrease))
        .to.be.true;
    });
  });

  context('exit with ETH', async () => {
    before(async function () {
      this.timeout(20000);
      amountsOut = pool.tokens.map((t) =>
        parseFixed(t.balance, t.decimals).div(amountsOutDiv).toString()
      );

      const exitTokens = pool.tokensList.map((token) =>
        token ===
        balancer.networkConfig.addresses.tokens.wrappedNativeAsset.toLowerCase()
          ? AddressZero
          : token
      );

      await testFlow(
        pool.buildExitExactTokensOut(
          signerAddress,
          exitTokens,
          amountsOut,
          slippage
        ),
        exitTokens,
        true
      );
    });

    it('should work', async () => {
      expect(transactionReceipt.status).to.eql(1);
    });

    it('tokens balance should increase by exact amountsOut', async () => {
      for (let i = 0; i < tokensBalanceAfter.length; i++) {
        expect(
          tokensBalanceAfter[i]
            .sub(tokensBalanceBefore[i])
            .eq(tokensMinBalanceIncrease[i])
        ).to.be.true;
      }
    });

    it('bpt balance should decrease by max bptMaxBalanceDecrease', async () => {
      expect(bptBalanceBefore.sub(bptBalanceAfter).lte(bptMaxBalanceDecrease))
        .to.be.true;
    });
  });

  context('exit with ETH - conflicting inputs', async () => {
    it('should fail', async () => {
      let errorMessage = '';
      try {
        const bptIn = parseFixed('10', 18).toString();
        await testFlow(
          pool.buildExitExactBPTIn(
            signerAddress,
            bptIn,
            slippage,
            false,
            AddressZero
          ),
          pool.tokensList
        );
      } catch (error) {
        errorMessage = (error as Error).message;
      }
      expect(errorMessage).to.eql(
        'shouldUnwrapNativeAsset and singleTokenMaxOut should not have conflicting values'
      );
    });
  });
}).timeout(20000);
