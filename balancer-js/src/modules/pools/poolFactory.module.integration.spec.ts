import dotenv from 'dotenv';
import { expect } from 'chai';
import { BalancerSdkConfig, BalancerSDK, WeightedPoolEncoder } from '@/.';
import { ADDRESSES } from '@/test/lib/constants';
import { BigNumber, ethers } from 'ethers';
import {
  BalancerHelpers__factory,
  BalancerHelpers,
} from '@balancer-labs/typechain';
import { forkSetup } from '@/test/lib/utils';

dotenv.config();

const { ALCHEMY_URL: jsonRpcUrl } = process.env;

const rpcUrl = 'http://127.0.0.1:8545';
const provider = new ethers.providers.JsonRpcProvider(rpcUrl, 1);
const signer = provider.getSigner();

const sdkConfig: BalancerSdkConfig = {
  network: 1,
  rpcUrl: rpcUrl,
};

const tokens = [ADDRESSES[1].USDT, ADDRESSES[1].DAI, ADDRESSES[1].WBTC];

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

const INIT_JOIN_PARAMS = {
  poolId: 200,
  sender: '0x0000000000000000000000000000000000000001',
  receiver: '0x0000000000000000000000000000000000000002',
  tokenAddresses: tokens.map((v) => v.address),
  initialBalancesString: [
    '2000000000000000000',
    '2000000000000000000',
    '2000000000000000000',
  ],
};

const POOL_PARAMS = {
  symbol: 'WPOOL',
  initialFee: '0.1',
  seedTokens: SEED_TOKENS,
  owner: '0x0000000000000000000000000000000000000001',
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

describe('pool factory module', () => {
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
        expect.fail('Should not give error');
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
  context('initial join transaction', () => {
    let balancer: BalancerSDK,
      transactionReceipt: ethers.providers.TransactionReceipt,
      helpers: BalancerHelpers;
    beforeEach(async () => {
      balancer = new BalancerSDK(sdkConfig);
      const txAttributes = (await balancer.pools.weighted.buildCreateTx(
        POOL_PARAMS
      )) as ethers.providers.TransactionRequest;
      transactionReceipt = await (
        await signer.sendTransaction(txAttributes)
      ).wait();
      const filter = await balancer.pools.getPoolInfoFilter();

      helpers = BalancerHelpers__factory.connect(
        '0x5aDDCCa35b7A0D07C74063c48700C8590E87864E',
        provider
      );
    });

    it('should send the transaction succesfully', async () => {
      expect(transactionReceipt.status).to.eql(1);
    });

    it('should give user tokens on initial join', async () => {
      const filter = await balancer.pools.getPoolInfoFilter();

      const { bptOut } = await helpers.queryJoin(
        id.toString(),
        INIT_JOIN_PARAMS.sender,
        INIT_JOIN_PARAMS.receiver,
        {
          assets: INIT_JOIN_PARAMS.tokenAddresses,
          maxAmountsIn: Array(INIT_JOIN_PARAMS.tokenAddresses.length).fill(
            BigNumber.from('1000000000000000000000')
          ),
          userData: WeightedPoolEncoder.joinInit(
            INIT_JOIN_PARAMS.initialBalancesString
          ),
          fromInternalBalance: false,
        }
      );

      const tx = await balancer.pools.weighted.buildInitJoin(INIT_JOIN_PARAMS);
      await (await signer.sendTransaction(tx)).wait();
      const createdPool = getERC20Contract(address);
      const senderBalance: BigNumber = await createdPool.balanceOf(signer);
      expect(senderBalance).to.eql(bptOut);
    });

    it("should decrease the sender's token balance by the expected amount", async () => {
      const signerAddress = await signer.getAddress();

      const getTokenBalanceFromUserAddress =
        (user: string) =>
        (address: string): Promise<BigNumber> => {
          return getERC20Contract(address).balanceOf(user);
        };

      const initialTokenBalances = await Promise.all(
        INIT_JOIN_PARAMS.tokenAddresses.map(
          getTokenBalanceFromUserAddress(signerAddress)
        )
      );

      const expectedTokenBalances = initialTokenBalances.map((val, i) => {
        return val.sub(INIT_JOIN_PARAMS.initialBalancesString[i]);
      });

      const tx = await balancer.pools.weighted.buildInitJoin(INIT_JOIN_PARAMS);
      await (await signer.sendTransaction(tx)).wait();

      const finalTokenBalances = await Promise.all(
        INIT_JOIN_PARAMS.tokenAddresses.map(
          getTokenBalanceFromUserAddress(signerAddress)
        )
      );

      expectedTokenBalances.forEach((bal, i) => {
        expect(bal.eq(finalTokenBalances[i])).to.be.true;
      });
    });
  });
});
