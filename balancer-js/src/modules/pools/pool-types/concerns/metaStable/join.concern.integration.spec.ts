// yarn test:only ./src/modules/pools/pool-types/concerns/metaStable/join.concern.integration.spec.ts
import { parseFixed, BigNumber } from '@ethersproject/bignumber';
import { expect } from 'chai';
import dotenv from 'dotenv';
import hardhat from 'hardhat';
import { insert, Network, PoolWithMethods } from '@/.';
import { subSlippage } from '@/lib/utils/slippageHelper';
import { ADDRESSES } from '@/test/lib/constants';
import {
  forkSetup,
  sendTransactionGetBalances,
  TestPoolHelper,
} from '@/test/lib/utils';

dotenv.config();

const { ALCHEMY_URL: jsonRpcUrl } = process.env;
const { ethers } = hardhat;
const rpcUrl = 'http://127.0.0.1:8545';
const network = Network.MAINNET;
const provider = new ethers.providers.JsonRpcProvider(rpcUrl, network);
const signer = provider.getSigner();
const initialBalance = '100000';
// This blockNumber is before protocol fees were switched on (Oct `21), for blockNos after this tests will fail because results don't 100% match
const blockNumber = 13309758;
const testPoolId =
  '0x32296969ef14eb0c6d29669c550d4a0449130230000200000000000000000080';
// Slots used to set the account balance for each token through hardhat_setStorageAt
// Info fetched using npm package slot20
const slots = [ADDRESSES[network].wSTETH.slot, ADDRESSES[network].WETH.slot];

describe('MetaStablePool - Join Integration Tests', async () => {
  let signerAddress: string;
  let pool: PoolWithMethods;
  // Setup chain
  beforeEach(async function () {
    signerAddress = await signer.getAddress();
    const testPoolHelper = new TestPoolHelper(
      testPoolId,
      network,
      rpcUrl,
      blockNumber
    );
    pool = await testPoolHelper.getPool();
    const balances = pool.tokens.map((token) =>
      parseFixed(initialBalance, token.decimals).toString()
    );
    await forkSetup(
      signer,
      pool.tokensList,
      slots,
      balances,
      jsonRpcUrl as string,
      blockNumber
    );
    pool = await testPoolHelper.getPool(); //Updates the pool with the new state from the forked setup
    signerAddress = await signer.getAddress();
  });
  it('should join with encoded data', async () => {
    const tokensIn = pool.tokensList;
    const amountsIn = pool.tokens.map(({ decimals }, i) =>
      parseFixed((100 * i).toString(), decimals).toString()
    );
    const slippage = '1';
    const { to, data, minBPTOut, expectedBPTOut } = pool.buildJoin(
      signerAddress,
      tokensIn,
      amountsIn,
      slippage
    );
    const { transactionReceipt, balanceDeltas } =
      await sendTransactionGetBalances(
        [pool.address, ...tokensIn],
        signer,
        signerAddress,
        to,
        data
      );
    expect(transactionReceipt.status).to.eq(1);
    expect(BigInt(expectedBPTOut) > 0).to.be.true;
    const expectedDeltas = insert(amountsIn, 0, expectedBPTOut);
    expect(expectedDeltas).to.deep.eq(balanceDeltas.map((a) => a.toString()));
    const expectedMinBpt = subSlippage(
      BigNumber.from(expectedBPTOut),
      BigNumber.from(slippage)
    ).toString();
    expect(expectedMinBpt).to.deep.eq(minBPTOut);
  });
  it('should join using encoded data - single token has value', async () => {
    const tokensIn = pool.tokensList;
    const amountsIn = Array(tokensIn.length).fill('0');
    amountsIn[0] = parseFixed('301', 18).toString();
    const slippage = '0';
    const { to, data, minBPTOut, expectedBPTOut } = pool.buildJoin(
      signerAddress,
      tokensIn,
      amountsIn,
      slippage
    );

    const { transactionReceipt, balanceDeltas } =
      await sendTransactionGetBalances(
        [pool.address, ...tokensIn],
        signer,
        signerAddress,
        to,
        data
      );

    expect(transactionReceipt.status).to.eq(1);
    expect(BigInt(expectedBPTOut) > 0).to.be.true;
    const expectedDeltas = insert(amountsIn, 0, expectedBPTOut);
    expect(expectedDeltas).to.deep.eq(balanceDeltas.map((a) => a.toString()));
    const expectedMinBpt = subSlippage(
      BigNumber.from(expectedBPTOut),
      BigNumber.from(slippage)
    ).toString();
    expect(expectedMinBpt).to.deep.eq(minBPTOut);
  });
}).timeout(20000);
