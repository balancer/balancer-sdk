// yarn test:only ./src/modules/pools/factory/weighted/weighted.factory.spec.ts
import { expect } from 'chai';
import { Log, TransactionReceipt } from '@ethersproject/providers';
import { ethers } from 'hardhat';
import { Network, PoolType } from '@/types';
import { ADDRESSES } from '@/test/lib/constants';
import { BalancerSDK } from '@/modules/sdk.module';
import { Interface, LogDescription } from '@ethersproject/abi';
import {
  findEventInReceiptLogs,
  forkSetup,
  sendTransactionGetBalances,
} from '@/test/lib/utils';
import dotenv from 'dotenv';
import { isSameAddress } from '@/lib/utils';
import { Vault__factory } from '@/contracts/factories/Vault__factory';
import { WeightedPool__factory } from '@/contracts/factories/WeightedPool__factory';
import { WeightedPoolFactory__factory } from '@/contracts/factories/WeightedPoolFactory__factory';
import { BALANCER_NETWORK_CONFIG } from '@/lib/constants/config';
import { BigNumber, parseFixed } from '@ethersproject/bignumber';
import { Contract } from '@ethersproject/contracts';

dotenv.config();

const network = Network.MAINNET;
const rpcUrl = 'http://127.0.0.1:8545';
const alchemyRpcUrl = `${process.env.ALCHEMY_URL}`;
const blockNumber = 16320000;

const name = 'My-Test-Pool-Name';
const symbol = 'My-Test-Pool-Symbol';

const addresses = ADDRESSES[network];

const USDC_address = addresses.USDC.address;
const USDT_address = addresses.USDT.address;

const factoryAddress = `${BALANCER_NETWORK_CONFIG[network].addresses.contracts.weightedPoolFactory}`;
const owner = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const tokenAddresses = [USDC_address, USDT_address];
const swapFee = '0.01';
const weights = [`${0.2e18}`, `${0.8e18}`];
const slots = [addresses.USDC.slot, addresses.USDT.slot];
const balances = [
  parseFixed('100000', 6).toString(),
  parseFixed('100000', 6).toString(),
];
describe('creating weighted pool', () => {
  const provider = new ethers.providers.JsonRpcProvider(rpcUrl, network);
  const signer = provider.getSigner();
  const sdkConfig = {
    network,
    rpcUrl,
  };
  const balancer = new BalancerSDK(sdkConfig);
  const weightedPoolFactory = balancer.pools.poolFactory.of(PoolType.Weighted);
  let poolAddress = '';

  context('create and init join', async () => {
    before(async () => {
      await forkSetup(
        signer,
        tokenAddresses,
        slots,
        balances,
        alchemyRpcUrl,
        blockNumber,
        false
      );
    });
    it('should create a pool', async () => {
      const signerAddress = await signer.getAddress();
      const { to, data } = weightedPoolFactory.create({
        factoryAddress,
        name,
        symbol,
        tokenAddresses,
        weights,
        swapFee,
        owner,
      });
      const { transactionReceipt } = await sendTransactionGetBalances(
        [],
        signer,
        signerAddress,
        to as string,
        data as string
      );

      const weightedPoolFactoryInterface = new Interface(
        WeightedPoolFactory__factory.abi
      );

      const poolCreationEvent: LogDescription = findEventInReceiptLogs({
        receipt: transactionReceipt,
        contractInterface: weightedPoolFactoryInterface,
        to: to as string,
        logName: 'PoolCreated',
      });
      if (poolCreationEvent) {
        poolAddress = poolCreationEvent.args.pool;
      }
      expect(!!poolCreationEvent).to.be.true;
      return;
    });
    it('should init join a pool', async () => {
      const signerAddress = await signer.getAddress();
      const weightedPoolInterface = new Interface(WeightedPool__factory.abi);
      const pool = new Contract(poolAddress, weightedPoolInterface, provider);
      const poolId = await pool.getPoolId();
      const amountsIn = [
        parseFixed('2000', 6).toString(),
        parseFixed('8000', 6).toString(),
      ];
      const { to, data } = weightedPoolFactory.buildInitJoin({
        joiner: signerAddress,
        poolId,
        poolAddress,
        tokensIn: tokenAddresses,
        amountsIn,
      });
      const { transactionReceipt, balanceDeltas } =
        await sendTransactionGetBalances(
          [...tokenAddresses, poolAddress],
          signer,
          signerAddress,
          to as string,
          data as string
        );
      const vaultInterface = new Interface(Vault__factory.abi);
      const poolInitJoinEvent: LogDescription = findEventInReceiptLogs({
        receipt: transactionReceipt,
        to,
        contractInterface: vaultInterface,
        logName: 'PoolBalanceChanged',
      });
      expect(!!poolInitJoinEvent).to.be.true;
      expect(
        balanceDeltas
          .map((delta) => delta.toString())
          .slice(0, amountsIn.length)
      ).deep.equal(amountsIn);
      expect(balanceDeltas[amountsIn.length].toBigInt() > BigInt(0)).to.be.true;
    });
  });
});
