import dotenv from 'dotenv';
import { expect } from 'chai';
import { BigNumber, parseFixed } from '@ethersproject/bignumber';
import { BytesLike } from '@ethersproject/bytes';
import { TransactionReceipt } from '@ethersproject/providers';
import { ethers } from 'hardhat';
import { BalancerError, BalancerErrorCode } from '@/balancerErrors';
import { Network } from '@/lib/constants';
import { BalancerSDK } from '@/modules/sdk.module';
import { Pools } from '@/modules/pools';
import { forkSetup, getBalances } from '@/test/lib/utils';
import { JoinPoolRequest, Pool, PoolWithMethods } from '@/types';

import pools_16350000 from '@/test/lib/pools_16350000.json';
import { JoinPoolAttributes } from '../types';

dotenv.config();

const { ALCHEMY_URL: jsonRpcUrl } = process.env;
const rpcUrl = 'http://127.0.0.1:8545';
const network = Network.MAINNET;
const sdk = new BalancerSDK({ network, rpcUrl });
const { networkConfig } = sdk;

const provider = new ethers.providers.JsonRpcProvider(rpcUrl, network);
const signer = provider.getSigner();
let signerAddress: string;

describe('join execution', async () => {
  let transactionReceipt: TransactionReceipt;
  let bptBalanceBefore: BigNumber;
  let bptMinBalanceIncrease: BigNumber;
  let bptBalanceAfter: BigNumber;
  let tokensBalanceBefore: BigNumber[];
  let tokensBalanceAfter: BigNumber[];
  let tokensWithoutBpt: string[];
  let pool: PoolWithMethods;

  before(async function () {
    this.timeout(20000);
    const poolObj = pools_16350000.find(
      ({ id }) =>
        id ==
        '0xa13a9247ea42d743238089903570127dda72fe4400000000000000000000035d'
    ) as unknown as Pool;
    const initialBalances = poolObj.tokens.map((token) =>
      parseFixed('100000', token.decimals).toString()
    );
    const slots = [0, 0, 0, 0];
    await forkSetup(
      signer,
      poolObj.tokensList,
      slots,
      initialBalances,
      jsonRpcUrl as string,
      16350000 // holds the same state as the static repository
    );
    signerAddress = await signer.getAddress();
    const bptIndex = poolObj.tokensList.indexOf(poolObj.address);
    //REMOVING BPT
    tokensWithoutBpt = [...poolObj.tokensList];
    tokensWithoutBpt.splice(bptIndex, 1);
    pool = Pools.wrap(poolObj, networkConfig);
  });
  let joinPoolAttr: JoinPoolAttributes;
  context('join transaction - join with encoded data', () => {
    const amountsIn = [
      parseFixed('100', 18).toString(),
      parseFixed('101', 18).toString(),
      parseFixed('102', 18).toString(),
    ];
    const slippage = '100';

    before(async function () {
      this.timeout(20000);
      [bptBalanceBefore, ...tokensBalanceBefore] = await getBalances(
        [pool.address, ...tokensWithoutBpt],
        signer,
        signerAddress
      );
      joinPoolAttr = pool.buildJoin(
        signerAddress,
        tokensWithoutBpt,
        amountsIn,
        slippage
      );

      const tx = {
        to: joinPoolAttr.to,
        data: joinPoolAttr.data,
        gasLimit: 3000000,
      };

      bptMinBalanceIncrease = BigNumber.from(joinPoolAttr.minBPTOut);
      transactionReceipt = await (await signer.sendTransaction(tx)).wait();
      [bptBalanceAfter, ...tokensBalanceAfter] = await getBalances(
        [pool.address, ...tokensWithoutBpt],
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
      for (let i = 0; i < tokensWithoutBpt.length; i++) {
        expect(
          tokensBalanceBefore[i].sub(tokensBalanceAfter[i]).toString()
        ).to.equal(amountsIn[i]);
      }
    });
    it('should build the same for reversed array order for tokens and amounts', async () => {
      const tokensReversed = [...tokensWithoutBpt].reverse();
      const amountsInReversed = [...amountsIn].reverse();
      const newAttr = pool.buildJoin(
        signerAddress,
        tokensReversed,
        amountsInReversed,
        slippage
      );
      expect(joinPoolAttr).to.deep.eq(newAttr);
    });
  });
  context('join transaction - join with params', () => {
    const amountsIn = [
      parseFixed('0.001', 18).toString(),
      parseFixed('0.2', 18).toString(),
      parseFixed('3.1', 18).toString(),
    ];
    const slippage = '100';
    before(async function () {
      this.timeout(20000);

      [bptBalanceBefore, ...tokensBalanceBefore] = await getBalances(
        [pool.address, ...tokensWithoutBpt],
        signer,
        signerAddress
      );

      const { attributes, value, minBPTOut } = pool.buildJoin(
        signerAddress,
        tokensWithoutBpt,
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
        [pool.address, ...tokensWithoutBpt],
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
      for (let i = 0; i < tokensWithoutBpt.length; i++) {
        expect(
          tokensBalanceBefore[i].sub(tokensBalanceAfter[i]).toString()
        ).to.equal(amountsIn[i]);
      }
    });
  });

  context('join transaction - single token join', () => {
    const amountsIn = [parseFixed('0.001', 18).toString()];
    const slippage = '10';
    it('should fail on number of input tokens', async () => {
      let errorMessage;
      try {
        pool.buildJoin(
          signerAddress,
          tokensWithoutBpt.map((t) => t),
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
