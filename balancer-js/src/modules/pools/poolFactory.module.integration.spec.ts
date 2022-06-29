import dotenv from 'dotenv';
import { expect } from 'chai';
import { BalancerSdkConfig, BalancerSDK, SeedToken } from '@/.';
import { ADDRESSES } from '@/test/lib/constants';
import { BigNumber, ethers } from 'ethers';
import { WeightedPoolFactory, WeightedPoolFactory__factory } from '@balancer-labs/typechain'
import { Interface } from '@ethersproject/abi';

dotenv.config();

const { ALCHEMY_URL: jsonRpcUrl } = process.env;

const getFactoryContract = (address: string) => {
  return new ethers.Contract(
    address,
    ['function balanceOf(address) view returns (uint256)'],
    provider
  );
};

const rpcUrl = 'http://127.0.0.1:8545';
const provider = new ethers.providers.JsonRpcProvider(rpcUrl, 1);
const signer = provider.getSigner();

const sdkConfig: BalancerSdkConfig = {
  network: 1,
  rpcUrl: rpcUrl,
};

const SEED_TOKENS: Array<SeedToken> = [
  {
    id: 0,
    tokenAddress: ADDRESSES[42].DAI.address,
    weight: 30,
    amount: '200000000',
  },
  {
    id: 1,
    tokenAddress: ADDRESSES[42].USDC.address,
    weight: 40,
    amount: '200000000',
  },
  {
    id: 2,
    tokenAddress: ADDRESSES[42].WBTC.address,
    weight: 30,
    amount: '200000000',
  },
];

const INIT_JOIN_PARAMS = {
  poolId: 200,
  sender: '0x0000000000000000000000000000000000000001',
  receiver: '0x0000000000000000000000000000000000000002',
  tokenAddresses: [
    ADDRESSES[42].DAI.address,
    ADDRESSES[42].USDC.address,
    ADDRESSES[42].WBTC.address,
  ],
  initialBalancesString: [
    '2000000000000000000',
    '2000000000000000000',
    '2000000000000000000',
  ],
};

const POOL_PARAMS = {
  name: 'WeightedPoolFactory',
  symbol: 'WPOOL',
  initialFee: '0.1',
  seedTokens: SEED_TOKENS,
  owner: '0x0000000000000000000000000000000000000001',
  value: '0.1',
};
const poolFactoryContract = '';
const getERC20Contract = (address: string) => {
  return new ethers.Contract(
    address,
    [
      'function balanceOf(address) view returns (uint256)',
      'function name() returns (string)',
    ],
    provider
  );
};

describe('pool factory module', () => {
  // Setup chain
  before(async function () {
    this.timeout(20000);
    await provider.send('hardhat_reset', [
      {
        forking: {
          jsonRpcUrl,
        },
      },
    ]);
  });

  context('factory transaction', () => {
    let balancer: BalancerSDK,
      to: string,
      data: string,
      value: BigNumber,
      expectedPoolName: string,
      transactionReceipt: ethers.providers.TransactionReceipt,
      wPoolFactory: WeightedPoolFactory;
    beforeEach(async () => {
      balancer = new BalancerSDK(sdkConfig);
      const createTx = await balancer.pools.weighted.buildCreateTx(POOL_PARAMS);
      to = createTx.to;
      data = createTx.data;
      value = createTx.value as BigNumber;
      expectedPoolName = createTx.attributes.name;
      const tx = { to, data, value };
      transactionReceipt = await (await signer.sendTransaction(tx)).wait();
      wPoolFactory = WeightedPoolFactory__factory.connect(to, provider)
    });

    it('should send the transaction succesfully', async () => {
      expect(transactionReceipt.status).to.eql(1);
    });

    it('should create a pool with the correct token name', async () => {
      const { address } = wPoolFactory.filters.PoolCreated()
      const tokenContract = getERC20Contract(address as string);
      expect(expectedPoolName).to.eql(await tokenContract.getName());
    });
  });
  context('initial join transaction', () => {
    let balancer: BalancerSDK,
      transactionReceipt: ethers.providers.TransactionReceipt;
    beforeEach(async () => {
      balancer = new BalancerSDK(sdkConfig);
      const txAttributes = await balancer.pools.weighted.buildCreateTx(
        POOL_PARAMS
      );
      transactionReceipt = await (
        await signer.sendTransaction(txAttributes)
      ).wait();
    });

    it('should send the transaction succesfully', async () => {
      expect(transactionReceipt.status).to.eql(1);
    });

    it('should give user tokens on initial join', async () => {
      const { address } = await balancer.pools.getPoolInfoFromCreateTx(
        transactionReceipt
      );
      const tx = await balancer.pools.weighted.buildInitJoin(INIT_JOIN_PARAMS);
      await (await signer.sendTransaction(tx)).wait();
      const createdPool = getERC20Contract(address);
      const senderBalance: BigNumber = await createdPool.balanceOf(signer);
      expect(senderBalance.gt(BigNumber.from('0'))).to.eql(true);
    });
  });
});
