import dotenv from 'dotenv';
import { expect } from 'chai';
import { BalancerSDK, Network, Pool, PoolToken } from '@/.';
import hardhat from 'hardhat';

import { TransactionReceipt } from '@ethersproject/providers';
import { BigNumber, parseFixed } from '@ethersproject/bignumber';
import { forkSetup, getBalances } from '@/test/lib/utils';
import { Pools } from '@/modules/pools';

import pools_14717479 from '@/test/lib/pools_14717479.json';
import { ExitPoolAttributes } from '../types';
import { AddressZero } from '@ethersproject/constants';

dotenv.config();

const { ALCHEMY_URL: jsonRpcUrl } = process.env;
const { ethers } = hardhat;

const rpcUrl = 'http://127.0.0.1:8545';
const network = Network.MAINNET;
const sdk = new BalancerSDK({ network, rpcUrl });
const { networkConfig } = sdk;
const provider = new ethers.providers.JsonRpcProvider(rpcUrl, network);
const signer = provider.getSigner();

// Slots used to set the account balance for each token through hardhat_setStorageAt
// Info fetched using npm package slot20
const BPT_SLOT = 0;
const initialBalance = '100000';
const slippage = '100';
const poolId =
  // '0xc45d42f801105e861e86658648e3678ad7aa70f900010000000000000000011e'; // 50OHM-25DAI-25WETH
  // '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014'; // Balancer 80 BAL 20 WETH
  // '0xa6f548df93de924d73be7d25dc02554c6bd66db500020000000000000000000e'; // B_50WBTC_50WETH
  '0x96646936b91d6b9d7d0c47c496afbf3d6ec7b6f8000200000000000000000019'; // Balancer 50 USDC 50 WETH

const pool = pools_14717479.find(
  (pool) => pool.id == poolId
) as unknown as Pool;

const controller = Pools.wrap(pool, networkConfig);

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

describe('exit weighted pools execution', async () => {
  // Setup chain
  before(async function () {
    this.timeout(20000);

    tokensOut = pool.tokens;
    await forkSetup(
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
          networkConfig.addresses.tokens.wrappedNativeAsset.toLowerCase()
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
        controller.buildExitExactBPTIn(signerAddress, bptIn, slippage),
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
      const amountsOutDiv = '100000000';
      amountsOut = pool.tokens.map((t, i) =>
        parseFixed(t.balance, t.decimals)
          .div(amountsOutDiv)
          .mul(i + 1) // non-proportional input amounts help improve weighted math calc validation
          .toString()
      );

      await testFlow(
        controller.buildExitExactTokensOut(
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
      const amountsOutDiv = '100000000';
      amountsOut = pool.tokens.map((t) =>
        parseFixed(t.balance, t.decimals).div(amountsOutDiv).toString()
      );

      const exitTokens = pool.tokensList.map((token) =>
        token ===
        networkConfig.addresses.tokens.wrappedNativeAsset.toLowerCase()
          ? AddressZero
          : token
      );

      await testFlow(
        controller.buildExitExactTokensOut(
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
          controller.buildExitExactBPTIn(
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
