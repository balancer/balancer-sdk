// yarn test:only ./src/modules/pools/pool-types/concerns/composableStable/join.concern.integration.spec.ts
import dotenv from 'dotenv';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { BigNumber, parseFixed } from '@ethersproject/bignumber';
import { insert, removeItem, PoolWithMethods, Network } from '@/.';
import { subSlippage } from '@/lib/utils/slippageHelper';
import {
  forkSetup,
  TestPoolHelper,
  sendTransactionGetBalances,
} from '@/test/lib/utils';

dotenv.config();

const network = Network.MAINNET;
const { ALCHEMY_URL: jsonRpcUrl } = process.env;
const rpcUrl = 'http://127.0.0.1:8545';
const provider = new ethers.providers.JsonRpcProvider(rpcUrl, network);
const signer = provider.getSigner();
const blockNumber = 16350000;
const testPoolId =
  '0xa13a9247ea42d743238089903570127dda72fe4400000000000000000000035d';

describe('ComposableStable pool join functions', async () => {
  let signerAddress: string;
  let pool: PoolWithMethods;
  // We have to rest the fork between each test as pool value changes after tx is submitted
  beforeEach(async () => {
    signerAddress = await signer.getAddress();

    const testPool = new TestPoolHelper(
      testPoolId,
      network,
      rpcUrl,
      blockNumber
    );

    // Gets initial pool info from Subgraph
    pool = await testPool.getPool();

    // Setup forked network, set initial token balances and allowances
    await forkSetup(
      signer,
      pool.tokensList,
      Array(pool.tokensList.length).fill(0),
      Array(pool.tokensList.length).fill(parseFixed('100000', 18).toString()),
      jsonRpcUrl as string,
      blockNumber // holds the same state as the static repository
    );

    // Updatate pool info with onchain state from fork block no
    pool = await testPool.getPool();
  });

  it('should join using encoded data - all tokens have value', async () => {
    const tokensIn = removeItem(pool.tokensList, pool.bptIndex);
    const amountsIn = tokensIn.map((_, i) =>
      parseFixed((i * 100).toString(), 18).toString()
    );
    const slippage = '6';
    const { to, data, minBPTOut, expectedBPTOut } = pool.buildJoin(
      signerAddress,
      tokensIn,
      amountsIn,
      slippage
    );

    const { transactionReceipt, balanceDeltas } =
      await sendTransactionGetBalances(
        pool.tokensList,
        signer,
        signerAddress,
        to,
        data
      );

    expect(transactionReceipt.status).to.eq(1);
    expect(BigInt(expectedBPTOut) > 0).to.be.true;
    const expectedDeltas = insert(amountsIn, pool.bptIndex, expectedBPTOut);
    expect(expectedDeltas).to.deep.eq(balanceDeltas.map((a) => a.toString()));
    const expectedMinBpt = subSlippage(
      BigNumber.from(expectedBPTOut),
      BigNumber.from(slippage)
    ).toString();
    expect(expectedMinBpt).to.deep.eq(minBPTOut);
  });

  it('should join using encoded data - single token has value', async () => {
    const tokensIn = removeItem(pool.tokensList, pool.bptIndex);
    const amountsIn = Array(tokensIn.length).fill('0');
    amountsIn[0] = parseFixed('202', 18).toString();
    const slippage = '6';
    const { to, data, minBPTOut, expectedBPTOut } = pool.buildJoin(
      signerAddress,
      tokensIn,
      amountsIn,
      slippage
    );

    const { transactionReceipt, balanceDeltas } =
      await sendTransactionGetBalances(
        pool.tokensList,
        signer,
        signerAddress,
        to,
        data
      );

    expect(transactionReceipt.status).to.eq(1);
    expect(BigInt(expectedBPTOut) > 0).to.be.true;
    const expectedDeltas = insert(amountsIn, pool.bptIndex, expectedBPTOut);
    expect(expectedDeltas).to.deep.eq(balanceDeltas.map((a) => a.toString()));
    const expectedMinBpt = subSlippage(
      BigNumber.from(expectedBPTOut),
      BigNumber.from(slippage)
    ).toString();
    expect(expectedMinBpt).to.deep.eq(minBPTOut);
  });

  it('should return correct attributes for joining', async () => {
    const tokensIn = removeItem(pool.tokensList, pool.bptIndex);
    const amountsIn = tokensIn.map((_, i) =>
      parseFixed((i * 100).toString(), 18).toString()
    );
    const slippage = '6';
    const { attributes, functionName } = pool.buildJoin(
      signerAddress,
      tokensIn,
      amountsIn,
      slippage
    );

    expect(functionName).to.eq('joinPool');
    expect(attributes.poolId).to.eq(testPoolId);
    expect(attributes.recipient).to.eq(signerAddress);
    expect(attributes.sender).to.eq(signerAddress);
    expect(attributes.joinPoolRequest.assets).to.deep.eq(pool.tokensList);
    expect(attributes.joinPoolRequest.fromInternalBalance).to.be.false;
    expect(attributes.joinPoolRequest.maxAmountsIn).to.deep.eq(
      insert(amountsIn, pool.bptIndex, '0')
    );
  });

  it('should automatically sort tokens/amounts in correct order', async () => {
    const tokensIn = removeItem(pool.tokensList, pool.bptIndex);
    const amountsIn = tokensIn.map((_, i) =>
      parseFixed((i * 100).toString(), 18).toString()
    );
    const slippage = '6';
    const attributesSorted = pool.buildJoin(
      signerAddress,
      tokensIn,
      amountsIn,
      slippage
    );
    const attributesUnSorted = pool.buildJoin(
      signerAddress,
      tokensIn.reverse(),
      amountsIn.reverse(),
      slippage
    );
    expect(attributesSorted).to.deep.eq(attributesUnSorted);
  });
});
