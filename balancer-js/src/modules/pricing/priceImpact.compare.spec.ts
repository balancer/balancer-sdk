// yarn test:only ./src/modules/pricing/priceImpact.compare.spec.ts
import { BigNumber, formatFixed, parseFixed } from '@ethersproject/bignumber';
import { JsonRpcProvider } from '@ethersproject/providers';
import dotenv from 'dotenv';

import {
  Address,
  BalancerSDK,
  Network,
  PoolToken,
  PoolWithMethods,
  SubgraphPoolBase,
  SwapType,
} from '@/.';
import { forkSetup, TestPoolHelper } from '@/test/lib/utils';
import { queryBatchSwap } from '../swaps/queryBatchSwap';

dotenv.config();

const { ALCHEMY_URL: jsonRpcUrl } = process.env;

const rpcUrl = 'http://127.0.0.1:8545';
const network = Network.MAINNET;
const sdk = new BalancerSDK({ network, rpcUrl });
const { contracts, pricing } = sdk;
const provider = new JsonRpcProvider(rpcUrl, 1);
const signer = provider.getSigner();
const { balancerHelpers, vault } = contracts;

const blockNumber = 18536155;
const testPoolId =
  '0x93d199263632a4ef4bb438f1feb99e57b4b5f0bd0000000000000000000005c2'; // 80BAL/20WETH

/**
 * When testing pools with phantom BPT (e.g. ComposableStable), indexes should consider pool tokens with BPT
 */

// swap config
const swapAmountFloat = '200';
const assetInIndex = 0;
const assetOutIndex = 2;

// single token join config
const joinAmountFloat = '1000';
const tokenInIndex = 0;

// unbalanced join config
const amountsInFloat = ['10', '0', '1000']; // should add value for BPT if present

describe('Price impact comparison tests', async () => {
  let pool: PoolWithMethods;
  let signerAddress: Address;
  let testPoolHelper: TestPoolHelper;

  before(async () => {
    signerAddress = await signer.getAddress();
    testPoolHelper = new TestPoolHelper(
      testPoolId,
      network,
      rpcUrl,
      blockNumber
    );
    pool = await testPoolHelper.getPool();
  });

  // Setup chain
  beforeEach(async function () {
    await forkSetup(signer, [], [], [], jsonRpcUrl as string, blockNumber);
    pool = await testPoolHelper.getPool(); // update the pool after the forkSetup;
  });

  context('swap', async () => {
    let swapAmount: BigNumber;

    before(() => {
      swapAmount = parseFixed(
        swapAmountFloat,
        pool.tokens[assetInIndex].decimals
      );
    });

    it('should calculate price impact - spot price method', async () => {
      const swapAmounts = await queryBatchSwap(
        vault,
        SwapType.SwapExactIn,
        [
          {
            poolId: pool.id,
            assetInIndex,
            assetOutIndex,
            amount: swapAmount.toString(),
            userData: '0x',
          },
        ],
        pool.tokensList
      );

      const amountIn = parseFloat(
        formatFixed(
          swapAmounts[assetInIndex],
          pool.tokens[assetInIndex].decimals
        )
      );

      const amountOut =
        -1 *
        parseFloat(
          formatFixed(
            swapAmounts[assetOutIndex],
            pool.tokens[assetOutIndex].decimals
          )
        );

      const effectivePrice = amountIn / amountOut;

      const subgraphPool: SubgraphPoolBase = pool as SubgraphPoolBase;

      const spotPrice = await pricing.getSpotPrice(
        pool.tokensList[assetInIndex],
        pool.tokensList[assetOutIndex],
        [subgraphPool]
      );

      const priceRatio = parseFloat(spotPrice) / effectivePrice;
      const priceImpact = 1 - priceRatio + parseFloat(pool.swapFee); // remove swapFee to have results similar to the UI
      console.log(`priceImpactSpotPrice: ${priceImpact}`);
    });

    it('should calculate price impact - ABA method', async () => {
      const swapAtoB = await queryBatchSwap(
        vault,
        SwapType.SwapExactIn,
        [
          {
            poolId: pool.id,
            assetInIndex,
            assetOutIndex,
            amount: swapAmount.toString(),
            userData: '0x',
          },
        ],
        pool.tokensList
      );
      const B = BigNumber.from(-1).mul(swapAtoB[assetOutIndex]);

      const swapBtoA = await queryBatchSwap(
        vault,
        SwapType.SwapExactIn,
        [
          {
            poolId: pool.id,
            assetInIndex: assetOutIndex,
            assetOutIndex: assetInIndex,
            amount: B.toString(),
            userData: '0x',
          },
        ],
        pool.tokensList
      );
      const finalA = parseFloat(
        formatFixed(
          BigNumber.from(-1).mul(swapBtoA[assetInIndex]),
          pool.tokens[assetInIndex].decimals
        )
      );

      const initialA = parseFloat(
        formatFixed(swapAmount, pool.tokens[assetInIndex].decimals)
      );

      const priceImpactABA = (initialA - finalA) / initialA / 2;
      console.log(`priceImpactABA      : ${priceImpactABA}`);
    });
  });

  context('single token join', async () => {
    let tokenIn: PoolToken;
    let amountIn: BigNumber;

    before(() => {
      tokenIn = pool.tokens[tokenInIndex];
      amountIn = parseFixed(joinAmountFloat, tokenIn.decimals);
    });

    it('should calculate price impact - spot price method', async () => {
      const tokensIn = [...pool.tokensList];
      const amountsIn = Array(pool.tokensList.length).fill('0');

      amountsIn[tokenInIndex] = amountIn.toString();

      const bptIndex = tokensIn.findIndex((t) => t === pool.address);
      if (bptIndex > -1) {
        tokensIn.splice(bptIndex, 1);
        amountsIn.splice(bptIndex, 1);
      }

      const { priceImpact } = pool.buildJoin(
        signerAddress,
        tokensIn,
        amountsIn,
        '0' // slippage
      );

      const priceImpactFloat = parseFloat(
        formatFixed(BigNumber.from(priceImpact), 18)
      );
      console.log(`priceImpactSpotPrice: ${priceImpactFloat}`);
    });

    it('should calculate price impact - ABA method', async () => {
      const maxAmountsInByToken = new Map<string, BigNumber>([
        [tokenIn.address, amountIn],
      ]);

      const joinParams = pool.buildQueryJoinExactIn({
        maxAmountsInByToken,
      });

      const { bptOut } = await balancerHelpers.callStatic.queryJoin(
        ...joinParams
      );

      const exitParams = pool.buildQueryExitToSingleToken({
        bptIn: bptOut,
        tokenOut: tokenIn.address,
      });

      const { amountsOut } = await balancerHelpers.callStatic.queryExit(
        ...exitParams
      );

      const initialA = parseFloat(formatFixed(amountIn, tokenIn.decimals));
      const finalA = parseFloat(
        formatFixed(amountsOut[tokenInIndex], tokenIn.decimals)
      );
      const priceImpactABA = (initialA - finalA) / initialA / 2;
      console.log(`priceImpactABA      : ${priceImpactABA}`);
    });
  });

  context('unbalanced join - 2 tokens', async () => {
    let tokensIn: string[];
    let amountsIn: BigNumber[];

    beforeEach(() => {
      tokensIn = [...pool.tokensList];
      amountsIn = pool.tokens.map((token, i) =>
        parseFixed(amountsInFloat[i], token.decimals)
      );
    });

    it('should calculate price impact - spot price method', async () => {
      const bptIndex = tokensIn.findIndex((t) => t === pool.address);
      if (bptIndex > -1) {
        tokensIn.splice(bptIndex, 1);
        amountsIn.splice(bptIndex, 1);
      }

      const { priceImpact } = pool.buildJoin(
        signerAddress,
        tokensIn,
        amountsIn.map((amount) => amount.toString()),
        '0' // slippage
      );

      const priceImpactFloat = parseFloat(
        formatFixed(BigNumber.from(priceImpact), 18)
      );
      console.log(`priceImpactSpotPrice: ${priceImpactFloat}`);
    });

    it('should calculate price impact - ABA method', async () => {
      const maxAmountsInByToken = new Map<string, BigNumber>(
        amountsIn.map((a, i) => [tokensIn[i], a])
      );

      // query unbalanced join
      const { bptOut } = await balancerHelpers.callStatic.queryJoin(
        ...pool.buildQueryJoinExactIn({
          maxAmountsInByToken,
        })
      );

      // calculate proportional amounts out
      const { amountsOut } = await balancerHelpers.callStatic.queryExit(
        ...pool.buildQueryExitProportionally({
          bptIn: bptOut,
        })
      );

      // diff between unbalanced and proportional amounts for token 1
      const diffs = amountsOut.map((a, i) => a.sub(amountsIn[i]));
      const excessIndex = diffs.findIndex((a) => a.gt(0)); // token index that has excess amount on proportional compared to unbalanced
      const otherIndex = diffs.findIndex((a) => a.lt(0));
      const diffExcess = amountsOut[excessIndex].sub(amountsIn[excessIndex]);

      // swap that diff to token other (non-excess)
      const returnAmounts = await queryBatchSwap(
        vault,
        SwapType.SwapExactIn,
        [
          {
            poolId: pool.id,
            assetInIndex: excessIndex,
            assetOutIndex: otherIndex,
            amount: diffExcess.toString(),
            userData: '0x',
          },
        ],
        pool.tokensList
      );

      // calculate final other token amount (using sub because returnAmounts[0] is negative)
      const otherTokenFinal = amountsOut[otherIndex].sub(
        BigNumber.from(returnAmounts[otherIndex])
      );

      // diff between unbalanced and proportional amounts for token 0
      const diffOther = amountsIn[otherIndex].sub(otherTokenFinal);

      // query join with diffOther in order to get BPT difference between unbalanced and proportional
      const diffAmounts = new Map<string, BigNumber>([
        [pool.tokensList[otherIndex], diffOther],
      ]);

      const { bptOut: bptOutDiff } = await balancerHelpers.callStatic.queryJoin(
        ...pool.buildQueryJoinExactIn({
          maxAmountsInByToken: diffAmounts,
        })
      );

      const initialBPT = parseFloat(formatFixed(bptOut, 18));
      const finalBPT = parseFloat(formatFixed(bptOut.sub(bptOutDiff), 18));

      const priceImpactABA = (initialBPT - finalBPT) / initialBPT / 2;
      console.log(`priceImpactABA      : ${priceImpactABA}`);
    });
  });
});
