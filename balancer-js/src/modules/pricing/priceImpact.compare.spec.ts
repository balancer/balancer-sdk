// yarn test:only ./src/modules/pricing/priceImpact.compare.spec.ts
import { BigNumber, formatFixed, parseFixed } from '@ethersproject/bignumber';
import { JsonRpcProvider } from '@ethersproject/providers';
import dotenv from 'dotenv';
import * as fs from 'fs';

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
const csvFilePath = 'results.csv';
// Write the header to the CSV file
const csvLine = 'action,test,spot price,ABA,error abs,error rel\n';
fs.writeFileSync(csvFilePath, csvLine, { flag: 'w' });

const blockNumber = 18559730;
const testPoolId =
  '0x42ed016f826165c2e5976fe5bc3df540c5ad0af700000000000000000000058b'; // 80BAL/20WETH

/**
 * When testing pools with phantom BPT (e.g. ComposableStable), indexes should consider pool tokens with BPT
 */

// swap config
const swapAmountFloat = '10';
const swapAmountFloats = [
  swapAmountFloat,
  String(Number(swapAmountFloat) * 2),
  String(Number(swapAmountFloat) * 5),
  String(Number(swapAmountFloat) * 10),
  String(Number(swapAmountFloat) * 25),
  String(Number(swapAmountFloat) * 50),
  String(Number(swapAmountFloat) * 100),
];
const assetInIndex = 1;
const assetOutIndex = 2;

// single token join config
const joinAmountFloat = '10';
// const tokenInIndex = 1;
const singleTokenJoinTests = [
  { amountFloat: joinAmountFloat, tokenIndex: 1 },
  { amountFloat: String(Number(joinAmountFloat) * 2), tokenIndex: 1 },
  { amountFloat: String(Number(joinAmountFloat) * 5), tokenIndex: 1 },
  { amountFloat: String(Number(joinAmountFloat) * 10), tokenIndex: 1 },
  { amountFloat: String(Number(joinAmountFloat) * 25), tokenIndex: 1 },
  { amountFloat: String(Number(joinAmountFloat) * 50), tokenIndex: 1 },
  { amountFloat: String(Number(joinAmountFloat) * 100), tokenIndex: 1 },
];

// unbalanced join config
// const amountsInFloat = ['0', '200', '100', '10']; // should add value for BPT if present
const unbalancedJoinTests = [
  { amountsInFloat: ['0', '200', '100', '10'] },
  { amountsInFloat: ['0', '2000', '100', '10'] },
  // Add more test scenarios as needed
];

describe('Price impact comparison tests', async () => {
  let pool: PoolWithMethods;
  let signerAddress: Address;
  let testPoolHelper: TestPoolHelper;
  let priceImpactSpot: number;
  let priceImpactABA: number;

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

  swapAmountFloats.forEach((swapAmountFloat, index) => {
    context('swap', async () => {
      let swapAmount: BigNumber;

      before(() => {
        swapAmount = parseFixed(
          swapAmountFloat,
          pool.tokens[assetInIndex].decimals
        );
      });

      after(() => {
        const csvLine = `swap,${
          index + 1
        },${priceImpactSpot},${priceImpactABA},${
          priceImpactABA - priceImpactSpot
        },${(priceImpactABA - priceImpactSpot) / priceImpactSpot}\n`;
        fs.writeFileSync(csvFilePath, csvLine, { flag: 'a' });
      });

      it(`should calculate price impact - spot price method - Test ${
        index + 1
      }`, async () => {
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
        priceImpactSpot = 1 - priceRatio + parseFloat(pool.swapFee); // remove swapFee to have results similar to the UI
        console.log(`priceImpactSpotPrice: ${priceImpactSpot}`);
      });

      it(`should calculate price impact - ABA method - Test ${
        index + 1
      }`, async () => {
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

        priceImpactABA = (initialA - finalA) / initialA / 2;
        console.log(`priceImpactABA      : ${priceImpactABA}`);
      });
    });
  });

  singleTokenJoinTests.forEach((test, index) => {
    context('single token join', async () => {
      let tokenIn: PoolToken;
      let amountIn: BigNumber;

      before(() => {
        tokenIn = pool.tokens[test.tokenIndex];
        amountIn = parseFixed(test.amountFloat, tokenIn.decimals);
      });

      after(() => {
        const csvLine = `single token join,${
          index + 1
        },${priceImpactSpot},${priceImpactABA},${
          priceImpactABA - priceImpactSpot
        },${(priceImpactABA - priceImpactSpot) / priceImpactSpot}\n`;
        fs.writeFileSync(csvFilePath, csvLine, { flag: 'a' });
      });

      it('should calculate price impact - spot price method', async () => {
        const tokensIn = [...pool.tokensList];
        const amountsIn = Array(pool.tokensList.length).fill('0');

        amountsIn[test.tokenIndex] = amountIn.toString(); // Use the index specified in the test scenario

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

        priceImpactSpot = parseFloat(
          formatFixed(BigNumber.from(priceImpact), 18)
        );
        console.log(`priceImpactSpotPrice: ${priceImpactSpot}`);
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
          formatFixed(amountsOut[test.tokenIndex], tokenIn.decimals) // Use the index specified in the test scenario
        );
        priceImpactABA = (initialA - finalA) / initialA / 2;
        console.log(`priceImpactABA      : ${priceImpactABA}`);
      });
    });
  });

  unbalancedJoinTests.forEach((test, index) => {
    context('unbalanced join - 2 tokens', async () => {
      let tokensIn: string[];
      let amountsIn: BigNumber[];

      beforeEach(() => {
        tokensIn = [...pool.tokensList];
        amountsIn = pool.tokens.map((token, i) =>
          parseFixed(test.amountsInFloat[i], token.decimals)
        );
      });

      after(() => {
        const csvLine = `unbalanced join,${
          index + 1
        },${priceImpactSpot},${priceImpactABA},${
          priceImpactABA - priceImpactSpot
        },${(priceImpactABA - priceImpactSpot) / priceImpactSpot}\n`;
        fs.writeFileSync(csvFilePath, csvLine, { flag: 'a' });
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

        priceImpactSpot = parseFloat(
          formatFixed(BigNumber.from(priceImpact), 18)
        );
        console.log(`priceImpactSpotPrice: ${priceImpactSpot}`);
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

        const { bptOut: bptOutDiff } =
          await balancerHelpers.callStatic.queryJoin(
            ...pool.buildQueryJoinExactIn({
              maxAmountsInByToken: diffAmounts,
            })
          );

        const initialBPT = parseFloat(formatFixed(bptOut, 18));
        const finalBPT = parseFloat(formatFixed(bptOut.sub(bptOutDiff), 18));

        priceImpactABA = (initialBPT - finalBPT) / initialBPT / 2;
        console.log(`priceImpactABA      : ${priceImpactABA}`);
      });
    });
  });
});
