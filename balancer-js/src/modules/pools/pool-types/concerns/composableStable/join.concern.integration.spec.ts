import { BalancerError, BalancerErrorCode } from '@/balancerErrors';
import { Network } from '@/lib/constants';
import { BalancerSDK } from '@/modules/sdk.module';
import { Pools } from '@/modules/pools';
import { forkSetup, getBalances } from '@/test/lib/utils';
import { JoinPoolRequest, Pool } from '@/types';
import { BigNumber, parseFixed } from '@ethersproject/bignumber';
import { BytesLike } from '@ethersproject/bytes';
import { TransactionReceipt } from '@ethersproject/providers';
import { ethers } from 'hardhat';
import { expect } from 'chai';
import dotenv from 'dotenv';
import pools_16350000 from '@/test/lib/pools_16350000.json';

dotenv.config();

const { ALCHEMY_URL: jsonRpcUrl } = process.env;
const rpcUrl = 'http://127.0.0.1:8545';
const network = Network.MAINNET;
const sdk = new BalancerSDK({ network, rpcUrl });
const { networkConfig } = sdk;

const amountsInDiv = '10000';
const initialBalance = '100000';
const provider = new ethers.providers.JsonRpcProvider(rpcUrl, network);
const signer = provider.getSigner();
let signerAddress: string;

const poolObj = pools_16350000.find(
  ({ id }) =>
    id == '0xa13a9247ea42d743238089903570127dda72fe4400000000000000000000035d'
) as unknown as Pool;

const tokensIn = [
  ...poolObj.tokens
    .filter(({ address }) => address !== poolObj.address)
    .map(({ address }) => address),
];

const poolTokensWithBptFirst = [
  ...poolObj.tokens.filter(({ address }) => address === poolObj.address),
  ...poolObj.tokens.filter(({ address }) => address !== poolObj.address),
];

let amountsIn = [
  parseFixed('100', 18).toString(),
  parseFixed('100', 18).toString(),
  parseFixed('100', 18).toString(),
];

const slots = [0, 0, 0, 0];

const pool = Pools.wrap(poolObj, networkConfig);

describe('join execution', async () => {
  let transactionReceipt: TransactionReceipt;
  let bptBalanceBefore: BigNumber;
  let bptMinBalanceIncrease: BigNumber;
  let bptBalanceAfter: BigNumber;
  let tokensBalanceBefore: BigNumber[];
  let tokensBalanceAfter: BigNumber[];

  before(async function () {
    this.timeout(20000);
    const balances = poolTokensWithBptFirst.map((token) =>
      token ? parseFixed(initialBalance, token.decimals).toString() : '0'
    );
    await forkSetup(
      signer,
      poolTokensWithBptFirst.map((t) => t.address),
      slots,
      balances,
      jsonRpcUrl as string,
      16350000 // holds the same state as the static repository
    );
    signerAddress = await signer.getAddress();
  });
  context('join transaction - join with encoded data', () => {
    before(async function () {
      this.timeout(20000);
      [bptBalanceBefore, ...tokensBalanceBefore] = await getBalances(
        poolTokensWithBptFirst.map(({ address }) => address),
        signer,
        signerAddress
      );
      const slippage = '100';

      const { to, data, minBPTOut } = pool.buildJoin(
        signerAddress,
        tokensIn,
        amountsIn,
        slippage
      );

      const tx = { to, data, gasLimit: 3000000 };

      bptMinBalanceIncrease = BigNumber.from(minBPTOut);
      transactionReceipt = await (await signer.sendTransaction(tx)).wait();
      [bptBalanceAfter, ...tokensBalanceAfter] = await getBalances(
        poolTokensWithBptFirst.map(({ address }) => address),
        signer,
        signerAddress
      );
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

      amountsIn = poolTokensWithBptFirst
        .slice(1)
        .map((t) =>
          parseFixed(t.balance, t.decimals).div(amountsInDiv).toString()
        );

      [bptBalanceBefore, ...tokensBalanceBefore] = await getBalances(
        poolTokensWithBptFirst.map(({ address }) => address),
        signer,
        signerAddress
      );

      const slippage = '100';
      const { attributes, value, minBPTOut } = pool.buildJoin(
        signerAddress,
        tokensIn,
        amountsIn,
        slippage
      );
      const attributesValues = Object.values(attributes) as [
        BytesLike,
        string,
        string,
        JoinPoolRequest
      ];
      const sendJoinTransaction = sdk.contracts.vault.connect(signer).joinPool;
      const transactionResponse = await sendJoinTransaction(
        ...attributesValues,
        { value }
      );
      transactionReceipt = await transactionResponse.wait();

      bptMinBalanceIncrease = BigNumber.from(minBPTOut);
      [bptBalanceAfter, ...tokensBalanceAfter] = await getBalances(
        poolTokensWithBptFirst.map(({ address }) => address),
        signer,
        signerAddress
      );
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
        parseFixed(
          poolTokensWithBptFirst[1].balance,
          poolTokensWithBptFirst[1].decimals
        )
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
          tokensIn.map((t) => t),
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
});
