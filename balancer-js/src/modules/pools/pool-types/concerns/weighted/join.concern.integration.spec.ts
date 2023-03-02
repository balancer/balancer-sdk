/* eslint-disable no-unexpected-multiline */
// yarn test:only ./src/modules/pools/pool-types/concerns/weighted/join.concern.integration.spec.ts
import { parseFixed, BigNumber } from '@ethersproject/bignumber';
import { expect } from 'chai';
import dotenv from 'dotenv';
import hardhat from 'hardhat';
import { Address, BalancerSDK, insert, Network, PoolWithMethods } from '@/.';
import {
  forkSetup,
  sendTransactionGetBalances,
  TestPoolHelper,
} from '@/test/lib/utils';
import { ADDRESSES } from '@/test/lib/constants';
import { subSlippage } from '@/lib/utils/slippageHelper';
import { AddressZero } from '@ethersproject/constants';

dotenv.config();

const { ALCHEMY_URL: jsonRpcUrl } = process.env;
const { ethers } = hardhat;

const rpcUrl = 'http://127.0.0.1:8545';
const network = Network.MAINNET;
const sdk = new BalancerSDK({ network, rpcUrl });
const { networkConfig } = sdk;
const provider = new ethers.providers.JsonRpcProvider(rpcUrl, 1);
const signer = provider.getSigner();

// Slots used to set the account balance for each token through hardhat_setStorageAt
// Info fetched using npm package slot20
const slots = [ADDRESSES[network].WBTC.slot, ADDRESSES[network].WETH.slot];
const initialBalance = '100000';
const testPoolId =
  '0xa6f548df93de924d73be7d25dc02554c6bd66db500020000000000000000000e'; // B_50WBTC_50WETH
const blockNumber = 13309758;

describe('Weighted Pool - Join - integration tests', async () => {
  let pool: PoolWithMethods;
  let signerAddress: Address;
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
    pool = await testPoolHelper.getPool(); // update the pool after the forkSetup;
  });
  it('should join with encoded data', async () => {
    const tokensIn = pool.tokensList;
    const amountsIn = pool.tokens.map((t, i) =>
      parseFixed((i * 100).toString(), t.decimals).toString()
    );
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
    expect(transactionReceipt.status).to.eql(1);
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
    amountsIn[0] = parseFixed('100', 8).toString();
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
  it('should join using ETH - single token has value', async () => {
    const tokensIn = pool.tokensList.map((token) =>
      token === networkConfig.addresses.tokens.wrappedNativeAsset.toLowerCase()
        ? AddressZero
        : token
    );
    const ethIndex = tokensIn.indexOf(AddressZero);
    const amountsIn = Array(tokensIn.length).fill('0');
    amountsIn[ethIndex] = parseFixed('1', 18).toString();
    const slippage = '0';
    const { to, data, value, minBPTOut, expectedBPTOut } = pool.buildJoin(
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
        data,
        value
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
