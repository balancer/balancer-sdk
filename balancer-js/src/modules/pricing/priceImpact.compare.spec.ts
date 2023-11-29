// yarn test:only ./src/modules/pricing/priceImpact.compare.spec.ts
import { BigNumber, formatFixed, parseFixed } from '@ethersproject/bignumber';
import { JsonRpcProvider } from '@ethersproject/providers';
import dotenv from 'dotenv';
import * as fs from 'fs';

import {
  Address,
  BalancerSDK,
  BatchSwapStep,
  Network,
  PoolToken,
  PoolWithMethods,
  SubgraphPoolBase,
  SwapType,
  max,
  min,
} from '@/.';
import { forkSetup, TestPoolHelper } from '@/test/lib/utils';
import { queryBatchSwap } from '../swaps/queryBatchSwap';
import { Zero } from '@ethersproject/constants';

dotenv.config();

const { ALCHEMY_URL: jsonRpcUrl } = process.env;

const rpcUrl = 'http://127.0.0.1:8545';
const network = Network.MAINNET;
const sdk = new BalancerSDK({ network, rpcUrl });
const { contracts, pricing } = sdk;
const provider = new JsonRpcProvider(rpcUrl, 1);
const signer = provider.getSigner();
const { balancerHelpers, vault } = contracts;
const csvFilePath = 'OATH_GRAIN_USDC_WETH_3.csv';
// Write the header to the CSV file
const csvLine = 'action,test,spot price,ABA,error abs,error rel,\n';
fs.writeFileSync(csvFilePath, csvLine, { flag: 'w' });
const writeNewTable = (header: string) => {
  fs.writeFileSync(csvFilePath, `${header}\n`, { flag: 'a' });
};

const blockNumber = 18559730;
const testPoolId =
  '0x67f117350eab45983374f4f83d275d8a5d62b1bf0001000000000000000004f2'; // 80BAL/20WETH

/**
 * When testing pools with phantom BPT (e.g. ComposableStable), indexes should consider pool tokens with BPT
 */

// swap config
const swapAmountFloat = '500';
const swapAmountFloats = [
  swapAmountFloat,
  String(Number(swapAmountFloat) * 2),
  String(Number(swapAmountFloat) * 5),
  String(Number(swapAmountFloat) * 10),
  String(Number(swapAmountFloat) * 25),
  String(Number(swapAmountFloat) * 50),
  String(Number(swapAmountFloat) * 100),
];
const assetInIndex = 3;
const assetOutIndex = 1;

// single token join config
const joinAmountFloat = '500';
const tokenIndex = 3;
const singleTokenJoinTests = [
  { amountFloat: joinAmountFloat, tokenIndex },
  { amountFloat: String(Number(joinAmountFloat) * 2), tokenIndex },
  { amountFloat: String(Number(joinAmountFloat) * 5), tokenIndex },
  { amountFloat: String(Number(joinAmountFloat) * 10), tokenIndex },
  { amountFloat: String(Number(joinAmountFloat) * 25), tokenIndex },
  { amountFloat: String(Number(joinAmountFloat) * 50), tokenIndex },
  { amountFloat: String(Number(joinAmountFloat) * 100), tokenIndex },
];

// unbalanced join config
// const amountsInFloat = ['0', '200', '100', '10']; // should add value for BPT if present
const unbalancedJoinTests = [
  { amountsInFloat: ['1', '1', '1', '10'] },
  { amountsInFloat: ['1', '1', '1', '100'] },
  { amountsInFloat: ['1', '1', '1', '1000'] },
  { amountsInFloat: ['1', '1', '1', '10000'] },
  { amountsInFloat: ['1', '1', '1', '200000'] },
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

      after(async () => {
        const csvLine = `swap,${
          index + 1
        },${priceImpactSpot},${priceImpactABA},${
          priceImpactABA - priceImpactSpot
        },${(priceImpactABA - priceImpactSpot) / priceImpactSpot}\n`;
        fs.writeFileSync(csvFilePath, csvLine, { flag: 'a' });

        writeNewTable('Swap Summary');

        // Query and write the token balances
        for (let i = 0; i < pool.tokensList.length; i++) {
          const token = pool.tokensList[i];
          const amount =
            i === assetInIndex ? swapAmountFloats[index].toString() : '0';
          const balance = await pool.tokens[i].balance;
          const relativeValue = (Number(amount) / Number(balance)).toString();
          fs.writeFileSync(
            csvFilePath,
            `${token},${amount},${balance.toString()},${relativeValue}\n`,
            { flag: 'a' }
          );
        }
        fs.writeFileSync(csvFilePath, '\n', { flag: 'a' });
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

      after(async () => {
        const csvLine = `single token join,${
          index + 1
        },${priceImpactSpot},${priceImpactABA},${
          priceImpactABA - priceImpactSpot
        },${(priceImpactABA - priceImpactSpot) / priceImpactSpot}\n`;
        fs.writeFileSync(csvFilePath, csvLine, { flag: 'a' });

        writeNewTable('Single-Sided Join Summary');

        // Query and write the token balances for single-sided join summary
        for (let i = 0; i < pool.tokensList.length; i++) {
          const token = pool.tokensList[i];
          const amount =
            i === singleTokenJoinTests[i].tokenIndex
              ? singleTokenJoinTests[index].amountFloat
              : '0';
          const balance = await pool.tokens[i].balance;
          const relativeValue = (Number(amount) / Number(balance)).toString();
          fs.writeFileSync(
            csvFilePath,
            `${token},${amount},${balance.toString()},${relativeValue}\n`,
            { flag: 'a' }
          );
        }

        // Write an empty line after single-sided join summary
        fs.writeFileSync(csvFilePath, '\n', { flag: 'a' });
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
    context('unbalanced join - generalized (multi-token)', async () => {
      let tokensIn: string[];
      let amountsIn: BigNumber[];

      beforeEach(() => {
        tokensIn = [...pool.tokensList];
        amountsIn = pool.tokens.map((token, i) =>
          parseFixed(test.amountsInFloat[i], token.decimals)
        );
      });

      after(async () => {
        const csvLine = `unbalanced join,${
          index + 1
        },${priceImpactSpot},${priceImpactABA},${
          priceImpactABA - priceImpactSpot
        },${(priceImpactABA - priceImpactSpot) / priceImpactSpot}\n`;
        fs.writeFileSync(csvFilePath, csvLine, { flag: 'a' });

        // Write unbalanced join summary table
        writeNewTable('Unbalanced Join Summary');

        // Query and write the token balances for unbalanced join summary
        for (let i = 0; i < pool.tokensList.length; i++) {
          const token = pool.tokensList[i];
          const amount = unbalancedJoinTests[index].amountsInFloat[i];
          const balance = await pool.tokens[i].balance;
          const relativeValue = (Number(amount) / Number(balance)).toString();
          fs.writeFileSync(
            csvFilePath,
            `${token},${amount},${balance.toString()},${relativeValue}\n`,
            { flag: 'a' }
          );
        }

        // Write an empty line after unbalanced join summary
        fs.writeFileSync(csvFilePath, '\n', { flag: 'a' });
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

      it('should calculate price impact - ABA method - generalized (multi-token)', async () => {
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

        const diffBPTs: BigNumber[] = [];
        for (let i = 0; i < diffs.length; i++) {
          if (diffs[i].eq(Zero)) {
            diffBPTs.push(Zero);
          } else {
            const diffQuery = await balancerHelpers.callStatic.queryJoin(
              ...pool.buildQueryJoinExactIn({
                maxAmountsInByToken: new Map<string, BigNumber>([
                  [tokensIn[i], diffs[i].abs()],
                ]),
              })
            );
            const diffBPT = diffQuery.bptOut.mul(diffs[i].gte(0) ? 1 : -1);
            diffBPTs.push(diffBPT);
          }
        }
        let minPositiveDiffIndex = 0;
        let minNegativeDiffIndex = 1;

        const nonZeroDiffs = diffs.filter((a) => !a.eq(Zero));
        for (let i = 0; i < nonZeroDiffs.length - 1; i++) {
          minPositiveDiffIndex = diffBPTs.findIndex((diffBPT) =>
            diffBPT.eq(min(diffBPTs.filter((a) => a.gt(0))))
          );
          minNegativeDiffIndex = diffBPTs.findIndex((diffBPT) =>
            diffBPT.eq(max(diffBPTs.filter((a) => a.lt(0))))
          );

          let returnAmounts: string[];
          if (
            diffBPTs[minPositiveDiffIndex] <
            diffBPTs[minNegativeDiffIndex].abs()
          ) {
            // swap that diff to token other (non-excess)
            returnAmounts = await queryBatchSwap(
              vault,
              SwapType.SwapExactIn,
              [
                {
                  poolId: pool.id,
                  assetInIndex: minPositiveDiffIndex,
                  assetOutIndex: minNegativeDiffIndex,
                  amount: diffs[minPositiveDiffIndex].toString(),
                  userData: '0x',
                },
              ],
              pool.tokensList
            );
            diffs[minPositiveDiffIndex] = Zero;
            diffBPTs[minPositiveDiffIndex] = Zero;
            diffs[minNegativeDiffIndex] = diffs[minNegativeDiffIndex].sub(
              BigNumber.from(returnAmounts[minNegativeDiffIndex])
            );
            const diffQuery = await balancerHelpers.callStatic.queryJoin(
              ...pool.buildQueryJoinExactIn({
                maxAmountsInByToken: new Map<string, BigNumber>([
                  [
                    tokensIn[minNegativeDiffIndex],
                    diffs[minNegativeDiffIndex].abs(),
                  ],
                ]),
              })
            );
            diffBPTs[minNegativeDiffIndex] = diffQuery.bptOut.mul(-1);
          } else {
            returnAmounts = await queryBatchSwap(
              vault,
              SwapType.SwapExactOut,
              [
                {
                  poolId: pool.id,
                  assetInIndex: minPositiveDiffIndex,
                  assetOutIndex: minNegativeDiffIndex,
                  amount: diffs[minNegativeDiffIndex].abs().toString(),
                  userData: '0x',
                },
              ],
              pool.tokensList
            );
            diffs[minNegativeDiffIndex] = Zero;
            diffBPTs[minNegativeDiffIndex] = Zero;
            diffs[minPositiveDiffIndex] = diffs[minPositiveDiffIndex].add(
              BigNumber.from(returnAmounts[minPositiveDiffIndex])
            );
            const diffQuery = await balancerHelpers.callStatic.queryJoin(
              ...pool.buildQueryJoinExactIn({
                maxAmountsInByToken: new Map<string, BigNumber>([
                  [
                    tokensIn[minPositiveDiffIndex],
                    diffs[minPositiveDiffIndex].abs(),
                  ],
                ]),
              })
            );
            diffBPTs[minPositiveDiffIndex] = diffQuery.bptOut;
          }
        }

        const amountInitial = parseFloat(
          amountsIn[minNegativeDiffIndex].toString()
        );
        const amountDiff = parseFloat(
          diffs[minNegativeDiffIndex].abs().toString()
        );

        priceImpactABA = amountDiff / amountInitial / 2;
        console.log(`priceImpactABA      : ${priceImpactABA}`);
      });
    });
  });
});
