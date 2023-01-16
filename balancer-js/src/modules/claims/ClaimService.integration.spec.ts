/* eslint-disable no-unexpected-multiline */
import {BalancerSDK, Network, Pool,} from '@/.';
import pools_14717479 from '@/test/lib/pools_14717479.json';

import {forkSetup, getBalances} from '@/test/lib/utils';
import {Interface} from "@ethersproject/abi";
import {BigNumber, parseFixed} from '@ethersproject/bignumber';
import {AddressZero} from '@ethersproject/constants';

import {TransactionReceipt} from '@ethersproject/providers';
import {expect} from 'chai';
import dotenv from 'dotenv';
import hardhat from 'hardhat';
import {Pools} from '../../../';

const liquidityGaugeInterface = new Interface([
  'function deposit(uint256 value)'
]);

dotenv.config();

const { ALCHEMY_URL: jsonRpcUrl } = process.env;
const { ethers } = hardhat;

const rpcUrl = 'http://127.0.0.1:8545';
const network = Network.MAINNET;
const sdk = new BalancerSDK({ network, rpcUrl });
const { networkConfig, claimService } = sdk;

const provider = new ethers.providers.JsonRpcProvider(rpcUrl, 1);
const signer = provider.getSigner();
let signerAddress: string;

// Slots used to set the account balance for each token through hardhat_setStorageAt
// Info fetched using npm package slot20
const wBTC_SLOT = 0;
const wETH_SLOT = 3;
const slots = [wBTC_SLOT, wETH_SLOT];

const initialBalance = '100000';
const amountsInDiv = '100000000';

let amountsIn: string[];
// Test scenarios

const poolId = '0xa6f548df93de924d73be7d25dc02554c6bd66db500020000000000000000000e';
const gaugeId = '0x4e3c048be671852277ad6ce29fd5207aa12fabff';
const lpToken = '0xA6F548DF93de924d73be7D25dC02554c6bD66dB5';

const pool = pools_14717479.find((pool) => pool.id == poolId) as unknown as Pool;
const tokensIn = pool.tokens;

const controller = Pools.wrap(pool, networkConfig);

describe('join execution', async () => {
  let transactionReceipt: TransactionReceipt;
  let lpTokenBalance: BigNumber;

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
      14717479 // holds the same state as the static repository
    );
    signerAddress = await signer.getAddress();
  });

  context('join transaction - join with ETH', () => {
    let transactionCost: BigNumber;
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
      const { to, data, value, minBPTOut } = controller.buildJoin(
        signerAddress,
        tokensWithETH,
        amountsIn,
        slippage
      );
      const tx = { to, data, value };

      transactionReceipt = await (await signer.sendTransaction(tx)).wait();

      [ lpTokenBalance ] = await getBalances(
        [lpToken],
        signer,
        signerAddress
      );
    });

    it('should work', async () => {
      expect(transactionReceipt.status).to.eql(1);
    });

    it('should have no staked tokens', async () => {
      if (!claimService) throw new Error('claimable service not available');
      const claimableToken = await claimService.getClaimableTokens(signerAddress);
      expect(claimableToken.length).to.eq(0);
    });

    it('should have lp token balance', async () => {
      expect(lpTokenBalance.gte(0)).to.be.true;
    });

    it('should allow staking', async () => {
      const data = liquidityGaugeInterface.encodeFunctionData('deposit', [lpTokenBalance]);
      const tx = { gaugeId, data };
      const receipt = await (await signer.sendTransaction(tx)).wait();
      expect(receipt.status).to.eql(1);
    })

    it('should have staked tokens', async () => {
      if (!claimService) throw new Error('claimable service not available');
      const claimableToken = await claimService.getClaimableTokens(signerAddress);
      expect(claimableToken.length).to.gt(0);
    });

  });

}).timeout(40000);
