import { BalancerSDK, Network, Pool } from '@/.';
import { TransactionData } from '@/modules/claims/ClaimService';
import { Pools } from '@/modules/pools';
import pools_14717479 from '@/test/lib/pools_14717479.json';

import { forkSetup, getBalances } from '@/test/lib/utils';
import { Interface } from '@ethersproject/abi';
import { TransactionRequest } from '@ethersproject/abstract-provider/src.ts';
import { BigNumber, parseFixed } from '@ethersproject/bignumber';
import { AddressZero } from '@ethersproject/constants';

import { TransactionReceipt } from '@ethersproject/providers';
import { expect } from 'chai';
import dotenv from 'dotenv';
import hardhat from 'hardhat';

const liquidityGaugeInterface = new Interface([
  {
    stateMutability: 'nonpayable',
    type: 'function',
    name: 'deposit',
    inputs: [
      {
        name: '_value',
        type: 'uint256',
      },
    ],
    outputs: [],
  },
]);

const ERC20Interface = new Interface([
  {
    inputs: [
      {
        internalType: 'address',
        name: 'spender',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'approve',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
]);

dotenv.config();

describe.skip('join and stake', async () => {
  const { ALCHEMY_URL: jsonRpcUrl } = process.env;
  const { ethers } = hardhat;

  const rpcUrl = 'http://127.0.0.1:8545';
  const network = Network.MAINNET;
  const sdk = new BalancerSDK({ network, rpcUrl });
  const { networkConfig, claimService } = sdk;

  const provider = new ethers.providers.JsonRpcProvider(rpcUrl, 1);
  const signer = provider.getSigner();
  let signerAddress: string;

  const wBTC_SLOT = 0;
  const wETH_SLOT = 3;
  const slots = [wBTC_SLOT, wETH_SLOT];

  const initialBalance = '100000';
  const amountsInDiv = '100000000';

  let amountsIn: string[];

  const poolId =
    '0xa6f548df93de924d73be7d25dc02554c6bd66db500020000000000000000000e';
  const gaugeId = '0x4e3c048be671852277ad6ce29fd5207aa12fabff';
  const lpToken = '0xA6F548DF93de924d73be7D25dC02554c6bD66dB5';

  const pool = pools_14717479.find(
    (pool) => pool.id == poolId
  ) as unknown as Pool;
  const tokensIn = pool.tokens;

  const controller = Pools.wrap(pool, networkConfig);

  let transactionReceipt: TransactionReceipt;
  let lpTokenBalance: BigNumber;
  let transactionData: TransactionData;
  const blockNumber = 16361609;
  // Setup chain
  before(async function () {
    this.timeout(20000);
    const balances = tokensIn.map((token) =>
      parseFixed(initialBalance, token.decimals).toString()
    );
    await forkSetup(
      signer,
      tokensIn.map((t) => t.address),
      slots,
      balances,
      jsonRpcUrl as string,
      blockNumber
    );
    signerAddress = await signer.getAddress();
  });

  context('join and stake with ETH', () => {
    before(async function () {
      this.timeout(40000);

      amountsIn = tokensIn.map((t) =>
        parseFixed(t.balance, t.decimals).div(amountsInDiv).toString()
      );

      const tokensWithETH = tokensIn.map((t) => {
        if (t.address === networkConfig.addresses.tokens.wrappedNativeAsset)
          return AddressZero;
        return t.address;
      });

      const slippage = '100';
      const { to, data, value } = controller.buildJoin(
        signerAddress,
        tokensWithETH,
        amountsIn,
        slippage
      );
      const tx = { to, data, value };

      transactionReceipt = await (await signer.sendTransaction(tx)).wait();
      expect(transactionReceipt.status).to.eql(1);

      [lpTokenBalance] = await getBalances([lpToken], signer, signerAddress);
    });

    it('should have lp token balance', async () => {
      expect(lpTokenBalance.gte(0)).to.be.true;
    });

    it('should have no staked tokens', async () => {
      if (!claimService) throw new Error('claimable service not available');
      const claimableToken = await claimService.getClaimableRewardTokens(
        signerAddress
      );
      expect(claimableToken.length).to.eq(0);
    });

    it('should allow staking', async () => {
      // TODO: this has been done as it happens in the dashboard. unfortunately it does not work in generating claimable tokens
      // approve transfer
      const approvalData = ERC20Interface.encodeFunctionData('approve', [
        gaugeId,
        lpTokenBalance,
      ]);
      const approvalTx: TransactionRequest = {
        to: lpToken,
        data: approvalData,
      };
      const approvalReceipt = await (
        await signer.sendTransaction(approvalTx)
      ).wait();
      expect(approvalReceipt.status).to.eql(1);

      // deposit funds
      const depositData = liquidityGaugeInterface.encodeFunctionData(
        'deposit',
        [lpTokenBalance]
      );
      const depositTx: TransactionRequest = {
        to: gaugeId,
        data: depositData,
      };
      const depositReceipt = await (
        await signer.sendTransaction(depositTx)
      ).wait();
      expect(depositReceipt.status).to.eql(1);
    });

    it('should have staked tokens to claim', async () => {
      if (!claimService) throw new Error('claimable service not available');
      transactionData = await claimService.buildClaimRewardTokensRequest(
        [gaugeId],
        signerAddress
      );
      expect(transactionData.tokensOut.length).to.gt(0);
    });

    it('should claim staked tokens successfully', async () => {
      const { to, callData } = transactionData;
      const tx = { to: to, data: callData };
      const receipt = await (await signer.sendTransaction(tx)).wait();
      expect(receipt.status).to.eql(1);
    });
  }).timeout(40000);
});
