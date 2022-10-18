import { parseEther } from '@ethersproject/units';
import { AddressZero } from '@ethersproject/constants';
import { Interface } from '@ethersproject/abi';
import { Contract } from '@ethersproject/contracts';
import { BigNumber } from '@ethersproject/bignumber';
import { WeightedPoolEncoder } from '../../../src/pool-weighted/encoder';
import { setTokenBalance } from '../../../src/test/lib/utils';
import { ethers } from 'hardhat';
import { JsonRpcSigner } from '@ethersproject/providers';
import WEIGHTED_POOL_FACTORY_ABI from './weighted_pool_factory.json';
import WEIGHTED_POOL_ABI from './weighted_pool.json';
import {
  Vault__factory,
  BalancerHelpers__factory,
} from '@balancer-labs/typechain';
import * as queries from '@/modules/pools/pool-types/concerns/weighted/queries';

const WEIGHTED_POOL_FACTORY = '0xcC508a455F5b0073973107Db6a878DdBDab957bC';
const iPool = new Interface(WEIGHTED_POOL_ABI);
const bn = (value: number): BigNumber => parseEther(`${value}`);
const fp = (value: number): string => bn(value).toString();

const rpcUrl = 'http://127.0.0.1:8545';
// const rpcUrl =
//   'https://rpc.tenderly.co/fork/d0879482-9a6a-4da2-b8a4-e50e487cf82d';

const provider = new ethers.providers.JsonRpcProvider(rpcUrl, 1);
const admin = provider.getSigner(1);
const lp = provider.getSigner(2);

const iERC20 = [
  'function approve(address,uint256) nonpayable',
  'function balanceOf(address) view returns(uint)',
];
const erc20 = new Contract(AddressZero, iERC20);
const vaultAddress = '0xBA12222222228d8Ba445958a75a0704d566BF2C8';
const vault = Vault__factory.connect(vaultAddress, provider);

const balancerHelpersAddress = '0x5aDDCCa35b7A0D07C74063c48700C8590E87864E';
const balancerHelpers = BalancerHelpers__factory.connect(
  balancerHelpersAddress,
  provider
);

interface NewPoolParams {
  name: string;
  symbol: string;
  tokens: string[];
  normalizedWeights: string[];
  rateProviders: string[];
  swapFeePercentage: string;
  owner: string;
}

const tokens = {
  DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
  wstETH: '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0',
  wETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
};
const slots = [2, 0, 3];

const TOKEN_COUNT = Object.values(tokens).length;

const newPoolParams = {
  name: 'dsETH',
  symbol: 'dsETH',
  tokens: Object.values(tokens),
  normalizedWeights: [0.6, 0.2, 0.2].map(fp),
  rateProviders: Array(TOKEN_COUNT).fill(AddressZero),
  swapFeePercentage: fp(0.01),
  owner: AddressZero,
};

// Create a new pool from a factory
const deploy = async (
  deployer: JsonRpcSigner,
  newPoolParams: NewPoolParams
) => {
  const iFactory = new Interface(WEIGHTED_POOL_FACTORY_ABI);
  const factory = new Contract(WEIGHTED_POOL_FACTORY, iFactory, deployer);

  const tx = await factory.create(...Object.values(newPoolParams));
  const { events } = await tx.wait();
  const poolAddress = events.find((event: any) => event.event == 'PoolCreated')
    .args[0];

  const pool = new Contract(poolAddress, iPool, deployer);
  const poolId = await pool.getPoolId();

  return poolId;
};

// Seed liquidity
const seed = async (lp: JsonRpcSigner, poolId: string, amountsIn: string[]) => {
  const lpAddress = await lp.getAddress();
  const tokenBalances = Array(amountsIn.length).fill(100).map(fp);
  await Promise.all(
    [lp].map((account) => {
      return Promise.all(
        Object.values(tokens).map((address, idx) => {
          return setTokenBalance(
            account,
            address,
            slots[idx],
            tokenBalances[idx],
            false
          );
        })
      );
    })
  );

  const balanceCheck = await Promise.all(
    Object.values(tokens).map(async (address, idx) => {
      return [await erc20.attach(address).connect(lp).balanceOf(lpAddress)];
    })
  );

  // Approve vault for seeder
  await Promise.all(
    Object.values(tokens).map((address) => {
      return erc20.attach(address).connect(lp).approve(vaultAddress, fp(100));
    })
  );

  // Approve vault for LP
  await Promise.all(
    Object.values(tokens).map((address) => {
      return erc20.attach(address).connect(lp).approve(vaultAddress, fp(100));
    })
  );

  // Seed liquidity
  // Calculate balances according to current prices
  const initTx = await vault
    .connect(lp)
    .joinPool(poolId, lpAddress, lpAddress, {
      assets: [...Object.values(tokens)],
      maxAmountsIn: amountsIn,
      userData: WeightedPoolEncoder.joinInit(amountsIn),
      fromInternalBalance: false,
    });

  const { events: initEvents } = await initTx.wait();
  if (initEvents) {
    console.log(
      initEvents.find((event: any) => event.event == 'PoolBalanceChanged')
    );
  }
};

// Proportional joins
const joinExactOut = async (
  lp: JsonRpcSigner,
  poolId: string,
  assets: string[],
  limits: BigNumber[],
  bptOut: BigNumber
) => {
  const lpAddress = await lp.getAddress();
  const txRequest = queries.joinExactOut(
    vault,
    lpAddress,
    lpAddress,
    poolId,
    assets,
    bptOut,
    limits
  );

  const tx = await lp.sendTransaction(txRequest);
  const receipt = await tx.wait();
  const event = receipt.logs.find(
    (log) =>
      log.topics[0] == vault.interface.getEventTopic('PoolBalanceChanged')
  );
  if (event) {
    console.log(vault.interface.parseLog(event));
  }
};

// Any asset join
const joinExactIn = async (
  lp: JsonRpcSigner,
  poolId: string,
  assets: string[],
  limits: BigNumber[],
  bptOut: BigNumber
) => {
  const lpAddress = await lp.getAddress();

  const txRequest = queries.joinExactIn(
    vault,
    lpAddress,
    lpAddress,
    poolId,
    assets,
    limits,
    bptOut
  );

  const tx = await lp.sendTransaction(txRequest);
  const receipt = await tx.wait();
  const event = receipt.logs.find(
    (log) =>
      log.topics[0] == vault.interface.getEventTopic('PoolBalanceChanged')
  );
  if (event) {
    console.log(vault.interface.parseLog(event));
  }
};

const exit = async (
  lp: JsonRpcSigner,
  poolId: string,
  assets: string[],
  limits: BigNumber[],
  bptIn: BigNumber
) => {
  const lpAddress = await lp.getAddress();

  const txRequest = queries.exit(
    vault,
    lpAddress,
    lpAddress,
    poolId,
    assets,
    limits,
    bptIn
  );

  const tx = await lp.sendTransaction(txRequest);
  const receipt = await tx.wait();
  const event = receipt.logs.find(
    (log) =>
      log.topics[0] == vault.interface.getEventTopic('PoolBalanceChanged')
  );
  if (event) {
    console.log(vault.interface.parseLog(event));
  }
};

const main = async () => {
  const assets = newPoolParams.tokens;
  const poolId = await deploy(admin, newPoolParams);
  await seed(lp, poolId, [60, 20, 20].map(fp));

  // Proportional join
  const expectedBptOut = bn(1);
  const { amountsIn: maxAmountsIn } = await queries.queryJoinExactOut(
    balancerHelpers,
    AddressZero,
    AddressZero,
    poolId,
    assets,
    expectedBptOut
  );
  await joinExactOut(lp, poolId, assets, maxAmountsIn, expectedBptOut);

  // Custom amounts in - may result in price impact
  const amountsIn = [10, 10, 10].map(bn);
  const { bptOut } = await queries.queryJoinExactIn(
    balancerHelpers,
    AddressZero,
    AddressZero,
    poolId,
    assets,
    amountsIn
  );
  await joinExactIn(lp, poolId, assets, amountsIn, bptOut);

  // Exit
  const [poolAddress] = await vault.getPool(poolId);
  const pool = new Contract(poolAddress, iPool, lp);
  const lpAddress = await lp.getAddress();
  const bptBalance = await pool.balanceOf(lpAddress);
  const { amountsOut } = await queries.queryExit(
    balancerHelpers,
    poolId,
    lpAddress,
    lpAddress,
    assets,
    bptBalance
  );
  await exit(lp, poolId, assets, amountsOut, bptBalance);
};

main();
