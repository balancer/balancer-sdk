// yarn test:only ./src/modules/pools/pool-types/concerns/composableStable/exit.concern.integration.spec.ts
import dotenv from 'dotenv';
import { expect } from 'chai';
import { Network, Pool } from '@/.';
import { TransactionReceipt } from '@ethersproject/providers';
import { BigNumber, parseFixed } from '@ethersproject/bignumber';
import {
  forkSetup,
  getBalances,
  getTestingRelevantParams,
} from '@/test/lib/utils';
import pools_16350000 from '@/test/lib/pools_16350000.json';
import pools_polygon from '@/test/lib/pools_polygon_39033320.json';
import { ExitExactTokensOutAttributes } from '@/modules/pools/pool-types/concerns/types';

dotenv.config();

describe('exit composable stable pool v1 execution', async () => {
  const {
    poolObj,
    pool,
    jsonRpcUrl,
    signer,
    tokensWithoutBPT: tokensOut,
  } = getTestingRelevantParams({
    network: Network.MAINNET,
    pools: pools_16350000,
    poolId:
      '0xa13a9247ea42d743238089903570127dda72fe4400000000000000000000035d',
    hasBPT: true,
  });

  const initialBalance = '100000';
  const slippage = '0'; // 0%

  let transactionReceipt: TransactionReceipt;
  let bptBalanceBefore: BigNumber;
  let bptBalanceAfter: BigNumber;
  let bptMaxBalanceDecrease: BigNumber;
  let tokensBalanceBefore: BigNumber[];
  let tokensBalanceAfter: BigNumber[];
  let tokensMinBalanceIncrease: BigNumber[];
  let signerAddress: string;

  // Setup chain
  before(async function () {
    await forkSetup(
      signer,
      poolObj.tokensList,
      Array(poolObj.tokensList.length).fill(0),
      Array(poolObj.tokensList.length).fill(
        parseFixed(initialBalance, 18).toString()
      ),
      jsonRpcUrl as string,
      16350000 // holds the same state as the static repository
    );
    signerAddress = await signer.getAddress();
  });

  const testFlow = async (
    [to, data, maxBPTIn, minAmountsOut]: [string, string, string, string[]],
    exitTokens: string[]
  ) => {
    // Check balances before transaction to confirm success
    [bptBalanceBefore, ...tokensBalanceBefore] = await getBalances(
      [poolObj.address, ...exitTokens],
      signer,
      signerAddress
    );
    // Get expected balances out of transaction
    bptMaxBalanceDecrease = BigNumber.from(maxBPTIn);
    tokensMinBalanceIncrease = minAmountsOut.map((a) => BigNumber.from(a));
    // Send transaction to local fork
    const transactionResponse = await signer.sendTransaction({
      to,
      data,
      gasLimit: 3000000,
    });
    transactionReceipt = await transactionResponse.wait();

    // Check balances after transaction to confirm success
    [bptBalanceAfter, ...tokensBalanceAfter] = await getBalances(
      [poolObj.address, ...exitTokens],
      signer,
      signerAddress
    );
  };

  context('exitExactBPTIn', async () => {
    context('single token max out', async () => {
      before(async function () {
        const bptIn = parseFixed('10', 18).toString();
        const { to, data, minAmountsOut } = pool.buildExitExactBPTIn(
          signerAddress,
          bptIn,
          slippage,
          false,
          tokensOut.map((t) => t.address)[0]
        );
        await testFlow(
          [to, data, bptIn, minAmountsOut],
          tokensOut.map((t) => t.address)
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
        expect(bptBalanceBefore.sub(bptBalanceAfter).eq(bptMaxBalanceDecrease))
          .to.be.true;
      });
    });
  });
  context('exitExactTokensOut', async () => {
    let exitExactTokensOutAttr: ExitExactTokensOutAttributes;
    let amountsOut: string[] = [];
    context('single token out', async () => {
      before(async function () {
        amountsOut = tokensOut.map((t, i) => {
          if (i === 0) {
            return parseFixed('202.1', t.decimals).toString();
          }
          return '0';
        });

        exitExactTokensOutAttr = pool.buildExitExactTokensOut(
          signerAddress,
          tokensOut.map((t) => t.address),
          amountsOut,
          slippage
        );

        const { to, data, maxBPTIn } = exitExactTokensOutAttr;
        const minAmountsOut = amountsOut.map(
          (a) =>
            BigNumber.from(a).sub(3).isNegative()
              ? a.toString()
              : BigNumber.from(a).sub(3).toString() //considering a margin of rounding error of 3;
        );

        await testFlow(
          [to, data, maxBPTIn, minAmountsOut],
          tokensOut.map(({ address }) => address)
        );
      });

      it('should work', async () => {
        expect(transactionReceipt.status).to.eql(1);
      });

      it('tokens balance should increase by exact amountsOut', async () => {
        for (let i = 0; i < tokensBalanceAfter.length; i++) {
          if (!tokensBalanceAfter[i].eq(tokensBalanceBefore[i])) {
            expect(
              //verifying if the token balance got near what is expected, with 3 points of margin for rounding differences
              tokensBalanceAfter[i]
                .sub(tokensBalanceBefore[i])
                .gte(tokensMinBalanceIncrease[i])
            ).to.be.true;
          }
        }
      });

      it('bpt balance should decrease by max bptMaxBalanceDecrease', async () => {
        expect(bptBalanceBefore.sub(bptBalanceAfter).lte(bptMaxBalanceDecrease))
          .to.be.true;
      });

      it('should build the same for reversed array order for tokens and amounts', async () => {
        const tokensOutReversed = [
          ...tokensOut.map((t) => t.address),
        ].reverse();
        const amountsOutReversed = [...amountsOut].reverse();
        const exitAttrFromReversed = pool.buildExitExactTokensOut(
          signerAddress,
          tokensOutReversed,
          amountsOutReversed,
          slippage
        );
        expect(exitAttrFromReversed).to.deep.eq(exitExactTokensOutAttr);
      });
    });
  });
});

describe('exit composable stable pool v2 execution', async () => {
  const {
    poolObj,
    pool,
    jsonRpcUrl,
    signer,
    tokensWithoutBPT: tokensOut,
  } = getTestingRelevantParams({
    network: Network.POLYGON,
    pools: pools_polygon,
    poolId:
      '0x373b347bc87998b151a5e9b6bb6ca692b766648a000000000000000000000923',
    hasBPT: true,
  });

  const initialBalance = '100000';
  const slippage = '0'; // 0%

  let transactionReceipt: TransactionReceipt;
  let bptBalanceBefore: BigNumber;
  let bptBalanceAfter: BigNumber;
  let bptMaxBalanceDecrease: BigNumber;
  let tokensBalanceBefore: BigNumber[];
  let tokensBalanceAfter: BigNumber[];
  let tokensMinBalanceIncrease: BigNumber[];
  let signerAddress: string;

  // Setup chain
  before(async function () {
    await forkSetup(
      signer,
      poolObj.tokensList,
      Array(poolObj.tokensList.length).fill(0),
      Array(poolObj.tokensList.length).fill(
        parseFixed(initialBalance, 18).toString()
      ),
      jsonRpcUrl as string,
      39033320 // holds the same state as the static repository
    );
    signerAddress = await signer.getAddress();
  });

  const testFlow = async (
    [to, data, maxBPTIn, minAmountsOut]: [string, string, string, string[]],
    exitTokens: string[]
  ) => {
    // Check balances before transaction to confirm success
    [bptBalanceBefore, ...tokensBalanceBefore] = await getBalances(
      [poolObj.address, ...exitTokens],
      signer,
      signerAddress
    );
    // Get expected balances out of transaction
    bptMaxBalanceDecrease = BigNumber.from(maxBPTIn);
    tokensMinBalanceIncrease = minAmountsOut.map((a) => BigNumber.from(a));
    // Send transaction to local fork
    const transactionResponse = await signer.sendTransaction({
      to,
      data,
      gasLimit: 3000000,
    });
    transactionReceipt = await transactionResponse.wait();

    // Check balances after transaction to confirm success
    [bptBalanceAfter, ...tokensBalanceAfter] = await getBalances(
      [poolObj.address, ...exitTokens],
      signer,
      signerAddress
    );
  };
  context('exitExactTokensOut', async () => {
    let exitExactTokensOutAttr: ExitExactTokensOutAttributes;
    let amountsOut: string[] = [];
    context('two tokens out', async () => {
      before(async function () {
        amountsOut = tokensOut.map((t, i) => {
          if (i === 0) {
            return parseFixed('1', t.decimals).toString();
          }
          if (i == 1) {
            return parseFixed('0.01', t.decimals).toString();
          }
          return '0';
        });

        exitExactTokensOutAttr = pool.buildExitExactTokensOut(
          signerAddress,
          tokensOut.map((t) => t.address),
          amountsOut,
          slippage
        );

        const { to, data, maxBPTIn } = exitExactTokensOutAttr;
        const minAmountsOut = amountsOut.map(
          (a) =>
            BigNumber.from(a).sub(3).isNegative()
              ? a.toString()
              : BigNumber.from(a).sub(3).toString() //considering a margin of rounding error of 3;
        );

        await testFlow(
          [to, data, maxBPTIn, minAmountsOut],
          tokensOut.map(({ address }) => address)
        );
      });

      it('should work', async () => {
        expect(transactionReceipt.status).to.eql(1);
      });

      it('tokens balance should increase by exact amountsOut', async () => {
        for (let i = 0; i < tokensBalanceAfter.length; i++) {
          if (!tokensBalanceAfter[i].eq(tokensBalanceBefore[i])) {
            expect(
              //verifying if the token balance got near what is expected, with 3 points of margin for rounding differences
              tokensBalanceAfter[i]
                .sub(tokensBalanceBefore[i])
                .gte(tokensMinBalanceIncrease[i])
            ).to.be.true;
          }
        }
      });

      it('bpt balance should decrease by max bptMaxBalanceDecrease', async () => {
        expect(bptBalanceBefore.sub(bptBalanceAfter).lte(bptMaxBalanceDecrease))
          .to.be.true;
      });

      it('should build the same for reversed array order for tokens and amounts', async () => {
        const tokensOutReversed = [
          ...tokensOut.map((t) => t.address),
        ].reverse();
        const amountsOutReversed = [...amountsOut].reverse();
        const exitAttrFromReversed = pool.buildExitExactTokensOut(
          signerAddress,
          tokensOutReversed,
          amountsOutReversed,
          slippage
        );
        expect(exitAttrFromReversed).to.deep.eq(exitExactTokensOutAttr);
      });
    });
  });
});
