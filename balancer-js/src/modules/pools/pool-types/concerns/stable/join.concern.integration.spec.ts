/* eslint-disable no-unexpected-multiline */
import { parseFixed, BigNumber } from '@ethersproject/bignumber';
import { expect } from 'chai';
import dotenv from 'dotenv';
import hardhat from 'hardhat';
import {
  BalancerError,
  BalancerErrorCode,
  Network,
  PoolWithMethods,
} from '@/.';
import { ADDRESSES } from '@/test/lib/constants';
import {
  forkSetup,
  sendTransactionGetBalances,
  TestPoolHelper,
} from '@/test/lib/utils';
import { subSlippage } from '@/lib/utils/slippageHelper';

dotenv.config();

const { ALCHEMY_URL: jsonRpcUrl } = process.env;
const { ethers } = hardhat;
const rpcUrl = 'http://127.0.0.1:8545';
const network = Network.MAINNET;
const provider = new ethers.providers.JsonRpcProvider(rpcUrl, network);
const signer = provider.getSigner();
const initialBalance = '100000';
const blockNumber = 14717479;
const testPoolId =
  '0x06df3b2bbb68adc8b0e302443692037ed9f91b42000000000000000000000063';
// Slots used to set the account balance for each token through hardhat_setStorageAt
// Info fetched using npm package slot20
const slots = [
  ADDRESSES[network].DAI.slot,
  ADDRESSES[network].USDC.slot,
  ADDRESSES[network].USDT.slot,
];

describe('join execution', async () => {
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
      14717479 // holds the same state as the static repository
    );
    signerAddress = await signer.getAddress();
  });
  it('should join with encoded data', async () => {
    const tokensIn = pool.tokensList;
    const amountsIn = pool.tokens.map(({ decimals }, i) =>
      parseFixed((i * 100).toString(), decimals).toString()
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
        tokensIn,
        signer,
        signerAddress,
        to,
        data
      );
    const expectedMinBpt = subSlippage(
      BigNumber.from(expectedBPTOut),
      BigNumber.from(slippage)
    ).toString();
    expect(transactionReceipt.status).to.eq(1);
    expect(BigInt(expectedBPTOut) > 0).to.be.true;
    expect(amountsIn).to.deep.eq(balanceDeltas.map((a) => a.toString()));
    expect(expectedMinBpt).to.deep.eq(minBPTOut);
  });
  it('should encode the same for different array sorting', () => {
    const tokensIn = pool.tokensList;
    const amountsIn = pool.tokens.map(({ decimals }, i) =>
      parseFixed((i * 100).toString(), decimals).toString()
    );
    const slippage = '1';
    const attributes = pool.buildJoin(
      signerAddress,
      tokensIn,
      amountsIn,
      slippage
    );
    const attributesReversed = pool.buildJoin(
      signerAddress,
      tokensIn.reverse(),
      amountsIn.reverse(),
      slippage
    );
    expect(attributesReversed).to.deep.eq(attributes);
  });
  it('should fail when joining with wrong amounts array length', () => {
    const tokensIn = pool.tokensList;
    const amountsIn = [parseFixed('1', pool.tokens[0].decimals).toString()];
    const slippage = '0';
    let errorMessage;
    try {
      pool.buildJoin(signerAddress, tokensIn, amountsIn, slippage);
    } catch (error) {
      errorMessage = (error as Error).message;
    }
    expect(errorMessage).to.contain(
      BalancerError.getMessage(BalancerErrorCode.INPUT_LENGTH_MISMATCH)
    );
  });
}).timeout(20000);
