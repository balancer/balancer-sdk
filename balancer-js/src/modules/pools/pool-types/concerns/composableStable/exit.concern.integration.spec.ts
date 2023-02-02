// yarn test:only ./src/modules/pools/pool-types/concerns/composableStable/exit.concern.integration.spec.ts
import dotenv from 'dotenv';
import { expect } from 'chai';
import { BalancerSDK, Network, Pool } from '@/.';
import hardhat from 'hardhat';

import { TransactionReceipt } from '@ethersproject/providers';
import { BigNumber, parseFixed } from '@ethersproject/bignumber';
import { forkSetup, getBalances } from '@/test/lib/utils';
import { Pools } from '@/modules/pools';

import pools_16350000 from '@/test/lib/pools_16350000.json';

dotenv.config();

const { ethers } = hardhat;

const { ALCHEMY_URL: jsonRpcUrl } = process.env;
const rpcUrl = 'http://127.0.0.1:8545';
const network = Network.MAINNET;
const { networkConfig } = new BalancerSDK({ network, rpcUrl });

const provider = new ethers.providers.JsonRpcProvider(rpcUrl, network);
const signer = provider.getSigner();

// Slots used to set the account balance for each token through hardhat_setStorageAt
// Info fetched using npm package slot20
const initialBalance = '100000';
const slippage = '0'; // 1%

const pool = pools_16350000.find(
  (pool) =>
    pool.id ==
    '0xa13a9247ea42d743238089903570127dda72fe4400000000000000000000035d' // Balancer Aave Boosted StablePool
) as unknown as Pool;
const tokensOut = pool.tokens.filter(({ address }) => address !== pool.address);
const controller = Pools.wrap(pool, networkConfig);

describe('exit stable pools execution', async () => {
  let amountsOut: string[];
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
      pool.tokensList,
      Array(pool.tokensList.length).fill(0),
      Array(pool.tokensList.length).fill(
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
      [pool.address, ...exitTokens],
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
      [pool.address, ...exitTokens],
      signer,
      signerAddress
    );
  };

  context('exitExactBPTIn', async () => {
    context('single token max out', async () => {
      before(async function () {
        const bptIn = parseFixed('10', 18).toString();
        const { to, data, minAmountsOut } = controller.buildExitExactBPTIn(
          signerAddress,
          bptIn,
          slippage,
          false,
          pool.tokensList.filter((address) => address !== pool.address)[0]
        );
        await testFlow(
          [to, data, bptIn, minAmountsOut],
          pool.tokensList.filter((address) => address !== pool.address)
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
    context('single token out', async () => {
      before(async function () {
        amountsOut = tokensOut.map((t, i) => {
          if (i === 0) {
            return parseFixed('202.1', t.decimals).toString();
          }
          return '0';
        });

        const { to, data, maxBPTIn } = controller.buildExitExactTokensOut(
          signerAddress,
          tokensOut.map((t) => t.address),
          amountsOut,
          slippage
        );

        await testFlow(
          [to, data, maxBPTIn, amountsOut],
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
              tokensBalanceAfter[i]
                .sub(tokensBalanceBefore[i])
                .eq(tokensMinBalanceIncrease[i].sub(BigNumber.from('1'))) ||
                tokensBalanceAfter[i]
                  .sub(tokensBalanceBefore[i])
                  .eq(tokensMinBalanceIncrease[i])
            ).to.be.true;
          }
        }
      });

      it('bpt balance should decrease by max bptMaxBalanceDecrease', async () => {
        expect(bptBalanceBefore.sub(bptBalanceAfter).lte(bptMaxBalanceDecrease))
          .to.be.true;
      });
    });
  });
});
