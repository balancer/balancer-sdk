import dotenv from 'dotenv';
import { expect } from 'chai';
import { BalancerSdkConfig, BalancerSDK, WeightedPoolEncoder } from '@/.';
import { ADDRESSES } from '@/test/lib/constants';
import { BigNumber, ethers } from 'ethers';
import {
  BalancerHelpers__factory,
  BalancerHelpers,
  WeightedPool__factory,
} from '@balancer-labs/typechain';
import { forkSetup } from '@/test/lib/utils';
import { AssetHelpers } from '@/lib/utils';
import { SeedToken } from './types';
dotenv.config();

const { ALCHEMY_URL: jsonRpcUrl } = process.env;

const rpcUrl = 'http://127.0.0.1:8545';
const provider = new ethers.providers.JsonRpcProvider(rpcUrl, 1);
const signer = provider.getSigner();
const helpers = new AssetHelpers(ADDRESSES['1'].WETH.address);

const sdkConfig: BalancerSdkConfig = {
  network: 42,
  rpcUrl: rpcUrl,
};

const tokens = [ADDRESSES[1].WBTC, ADDRESSES[1].DAI, ADDRESSES[1].USDT];

const SEED_TOKENS: Array<SeedToken> = [
  {
    id: 0,
    tokenAddress: tokens[0].address,
    weight: 40,
    amount: '200000000',
    symbol: tokens[0].symbol,
  },
  {
    id: 1,
    tokenAddress: tokens[1].address,
    weight: 30,
    amount: '200000000',
    symbol: tokens[1].symbol,
  },
  {
    id: 2,
    tokenAddress: tokens[2].address,
    weight: 30,
    amount: '200000000',
    symbol: tokens[2].symbol,
  },
];
const [tokenAddresses, initialBalancesString] = helpers.sortTokens(
  tokens.map((v) => v.address),
  ['2000000000000000000', '3000000000000000000', '2500000000000000000']
) as string[][];
const INIT_JOIN_PARAMS = {
  poolId: '',
  sender: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
  receiver: '0x0000000000000000000000000000000000000002',
  tokenAddresses,
  initialBalancesString,
};

const POOL_PARAMS = {
  symbol: 'WPOOL',
  initialFee: '0.1',
  seedTokens: SEED_TOKENS,
  owner: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
  value: '0.1',
};
const getERC20Contract = (address: string) => {
  return new ethers.Contract(
    address,
    [
      'function balanceOf(address) view returns (uint256)',
      'function name() view returns (string)',
    ],
    signer
  );
};

describe('pool factory module integration', () => {
  // Setup chain
  before(async function () {
    this.timeout(20000);
    // Sets up local fork granting signer initial balances and token approvals
    await forkSetup(
      signer,
      INIT_JOIN_PARAMS.tokenAddresses,
      tokens.map((v) => v.slot),
      INIT_JOIN_PARAMS.initialBalancesString,
      jsonRpcUrl as string
    );
  });

  context('factory transaction', async function () {
    let balancer: BalancerSDK,
      to: string,
      data: string,
      transactionReceipt: ethers.ContractReceipt;
    beforeEach(async function () {
      this.timeout(40000);
      balancer = new BalancerSDK(sdkConfig);
      const createTx = balancer.pools.weighted.buildCreateTx(POOL_PARAMS);
      if (createTx.error) {
        expect.fail('Should not give error: ' + createTx.message);
      } else {
        to = createTx.to;
        data = createTx.data;
        const from = await signer.getAddress();
        const tx = { from, to, data };
        const transactionResponse = await signer.sendTransaction(tx);
        transactionReceipt = await transactionResponse.wait();
      }
    });

    it('should send the transaction succesfully', async () => {
      expect(transactionReceipt.status).to.eql(1);
    });

    it('should create a pool with the correct token name', async function () {
      this.timeout(30000);
      const expectedPoolName = '40USDT-30DAI-30WBTC Pool';
      const { address } = await balancer.pools.getPoolInfoFromCreateTx(
        transactionReceipt,
        provider
      );
      const tokenContract = getERC20Contract(address);
      expect(expectedPoolName).to.eq(await tokenContract.name());
    });
  });
  context('initial join transaction (requires erc20 balances)', () => {
    let balancer: BalancerSDK,
      to: string,
      data: string,
      transactionReceipt: ethers.ContractReceipt;
    beforeEach(async function () {
      this.timeout(30000);
      balancer = new BalancerSDK(sdkConfig);
      const createTx = balancer.pools.weighted.buildCreateTx(POOL_PARAMS);
      if (createTx.error) {
        expect.fail('Should not give error: ' + createTx.message);
      } else {
        to = createTx.to;
        data = createTx.data;
        const from = await signer.getAddress();
        const tx = {
          from,
          to,
          data,
        };
        const transactionResponse = await signer.sendTransaction(tx);
        transactionReceipt = await transactionResponse.wait();
      }
    });

    it('should give user tokens on initial join', async function () {
      this.timeout(300000);
      const { address: poolAddress } =
        await balancer.pools.getPoolInfoFromCreateTx(
          transactionReceipt,
          provider
        );
      const pool = WeightedPool__factory.connect(poolAddress, provider);
      const poolId = await pool.getPoolId();
      INIT_JOIN_PARAMS.poolId = poolId;

      const helpers = BalancerHelpers__factory.connect(
        '0x5aDDCCa35b7A0D07C74063c48700C8590E87864E',
        provider
      );
      const tx = await balancer.pools.weighted.buildInitJoin(INIT_JOIN_PARAMS);
      if (tx.error) {
        expect.fail('should not give error: ' + tx.message);
      } else {
        const { poolId, sender, receiver, joinPoolRequest } = tx.attributes;
        await signer.sendTransaction({
          to: tx.to,
          from: signer._address,
          data: tx.data,
        });
        const createdPool = getERC20Contract(poolAddress);
        const senderBalance: BigNumber = await createdPool.balanceOf(
          signer._address
        );
        console.log(senderBalance.toString());
        expect(senderBalance).to.eql(false /* can't get this token amount */);
      }
    });

    it.only("should decrease the sender's token balance by the expected amount", async function () {
      this.timeout(30000);

      const getTokenBalanceFromUserAddress =
        (user: string) =>
        (address: string): Promise<BigNumber> => {
          return getERC20Contract(address).balanceOf(user);
        };
      const balanceOfSigner = getTokenBalanceFromUserAddress(signer._address);
      const initialTokenBalances = await Promise.all(
        tokens.map(async (token) => {
          const userBalance = await balanceOfSigner(token.address);
          return {
            symbol: token.symbol,
            userBalance,
          };
        })
      );
      const expectedTokenBalances = initialTokenBalances.map((val, i) => {
        return val.userBalance.sub(INIT_JOIN_PARAMS.initialBalancesString[i]);
      });

      const tx = await balancer.pools.weighted.buildInitJoin(INIT_JOIN_PARAMS);
      if (tx.error) {
        expect.fail('Transaction should not fail');
      }
      const { to, data } = tx;
      await (
        await signer.sendTransaction({ to, from: signer._address, data })
      ).wait();

      const finalTokenBalances = await Promise.all(
        INIT_JOIN_PARAMS.tokenAddresses.map(balanceOfSigner)
      );

      expectedTokenBalances.forEach((bal, i) => {
        expect(bal.eq(finalTokenBalances[i])).to.be.true;
      });
    });
  });
});
