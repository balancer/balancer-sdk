import { Network } from '@/lib/constants';
import { BalancerSDK } from '@/modules/sdk.module';
import { ethers } from 'hardhat';
import pools_14717479 from '@/test/lib/pools_14717479.json';
import { Pool } from '@/types';
import { Pools } from '@/modules/pools';
import { TransactionReceipt } from '@ethersproject/providers';
import { BigNumber, parseFixed } from '@ethersproject/bignumber';
import { forkSetup, getBalances } from '@/test/lib/utils';
import { expect } from 'chai';
import dotenv from 'dotenv';

dotenv.config();

const { ALCHEMY_URL: jsonRpcUrl } = process.env;
const rpcUrl = 'http://127.0.0.1:8545';
const network = Network.MAINNET;
const sdk = new BalancerSDK({ network, rpcUrl });
const { networkConfig } = sdk;

const initialBalance = '100000';
const provider = new ethers.providers.JsonRpcProvider(rpcUrl, network);
const signer = provider.getSigner();
let signerAddress: string;

const poolObj = pools_14717479.find(
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
const amountsIn = [
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
        pool.tokensList,
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
        [...pool.tokensList],
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
});
