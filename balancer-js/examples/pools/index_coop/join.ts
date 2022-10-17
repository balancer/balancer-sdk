import { parseEther } from '@ethersproject/units';
import { AddressZero } from '@ethersproject/constants';
import { Interface } from '@ethersproject/abi';
import { Contract } from '@ethersproject/contracts';
import { WeightedPoolEncoder } from '../../../src/pool-weighted/encoder';
import { setTokenBalance } from '../../../src/test/lib/utils';
import { ethers } from 'hardhat';
import WEIGHTED_POOL_FACTORY_ABI from './weighted_pool_factory.json';
import WEIGHTED_POOL_ABI from './weighted_pool.json';
import {
  Vault__factory,
  BalancerHelpers__factory,
} from '@balancer-labs/typechain';
const WEIGHTED_POOL_FACTORY = '0xcC508a455F5b0073973107Db6a878DdBDab957bC';
const fp = (value: number): string => parseEther(`${value}`).toString();

// const rpcUrl =
//   'https://rpc.tenderly.co/fork/d0879482-9a6a-4da2-b8a4-e50e487cf82d';

const rpcUrl = 'http://127.0.0.1:8545';
const provider = new ethers.providers.JsonRpcProvider(rpcUrl, 1);

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
const deploy = async (newPoolParams: NewPoolParams) => {
  const admin = provider.getSigner(1);
  const other = provider.getSigner(2);
  const lp = provider.getSigner(3);
  const otherAddress = await other.getAddress();
  const lpAddress = await lp.getAddress();
  const iFactory = new Interface(WEIGHTED_POOL_FACTORY_ABI);
  const factory = new Contract(WEIGHTED_POOL_FACTORY, iFactory, admin);

  const tx = await factory.create(...Object.values(newPoolParams));
  const { events } = await tx.wait();
  const poolAddress = events.find((event: any) => event.event == 'PoolCreated')
    .args[0];

  const iPool = new Interface(WEIGHTED_POOL_ABI);
  const pool = new Contract(poolAddress, iPool, admin);
  const poolId = await pool.getPoolId();

  console.log(poolId);

  // Seed liquidity
  const tokenBalances = Array(TOKEN_COUNT).fill(100).map(fp);
  await Promise.all(
    [other, lp].map((account) => {
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
      return [
        await erc20.attach(address).connect(other).balanceOf(otherAddress),
        await erc20.attach(address).connect(lp).balanceOf(lpAddress),
      ];
    })
  );

  // Approve vault for seeder
  await Promise.all(
    Object.values(tokens).map((address) => {
      return erc20
        .attach(address)
        .connect(other)
        .approve(vaultAddress, fp(100));
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
  const seedBalances = [60, 20, 20].map(fp);
  const initTx = await vault
    .connect(other)
    .joinPool(poolId, otherAddress, otherAddress, {
      assets: [...Object.values(tokens)],
      maxAmountsIn: seedBalances,
      userData: WeightedPoolEncoder.joinInit(seedBalances),
      fromInternalBalance: false,
    });

  const { events: initEvents } = await initTx.wait();
  if (initEvents) {
    console.log(
      initEvents.find((event: any) => event.event == 'PoolBalanceChanged')
    );
  }

  // Proportional joins
  // Find out proportional balances
  const proportionalJoinParams = await balancerHelpers.queryJoin(
    poolId,
    lpAddress,
    lpAddress,
    {
      assets: [...Object.values(tokens)],
      maxAmountsIn: [10, 10, 10].map(fp),
      userData: WeightedPoolEncoder.joinAllTokensInForExactBPTOut(fp(1)),
      fromInternalBalance: false,
    }
  );

  const { amountsIn } = proportionalJoinParams;

  const proportionalJoinTx = await vault
    .connect(lp)
    .joinPool(poolId, lpAddress, lpAddress, {
      assets: [...Object.values(tokens)],
      maxAmountsIn: amountsIn,
      userData: WeightedPoolEncoder.joinAllTokensInForExactBPTOut(fp(1)),
      fromInternalBalance: false,
    });

  const { events: proportionalEvents } = await proportionalJoinTx.wait();
  if (proportionalEvents) {
    console.log(
      proportionalEvents.find(
        (event: any) => event.event == 'PoolBalanceChanged'
      )
    );
  }

  // Single token join
  // Find out expected BPT out (optional)
  // Find out price impact
  const singleTokenJoinParams = await balancerHelpers.queryJoin(
    poolId,
    lpAddress,
    lpAddress,
    {
      assets: [...Object.values(tokens)],
      maxAmountsIn: [1, 0, 0].map(fp),
      userData: WeightedPoolEncoder.joinExactTokensInForBPTOut(
        [1, 0, 0].map(fp),
        fp(0)
      ),
      fromInternalBalance: false,
    }
  );
  const { bptOut } = singleTokenJoinParams;

  const singleTokenJoinTx = await vault
    .connect(lp)
    .joinPool(poolId, lpAddress, lpAddress, {
      assets: [...Object.values(tokens)],
      maxAmountsIn: [1, 0, 0].map(fp),
      userData: WeightedPoolEncoder.joinExactTokensInForBPTOut(
        [1, 0, 0].map(fp),
        bptOut
      ),
      fromInternalBalance: false,
    });

  const { events: singleTokenJoinEvents } = await singleTokenJoinTx.wait();

  if (singleTokenJoinEvents) {
    console.log(
      singleTokenJoinEvents.find(
        (event: any) => event.event == 'PoolBalanceChanged'
      )
    );
  }

  // Exit
  // Find out limits
  const bptBalance = await pool.balanceOf(lpAddress);

  const exitParams = await balancerHelpers.queryExit(
    poolId,
    lpAddress,
    lpAddress,
    {
      assets: [...Object.values(tokens)],
      minAmountsOut: [0, 0, 0].map(fp),
      userData: WeightedPoolEncoder.exitExactBPTInForTokensOut(bptBalance),
      toInternalBalance: false,
    }
  );

  const { amountsOut } = exitParams;

  const exitTx = await vault
    .connect(lp)
    .exitPool(poolId, lpAddress, lpAddress, {
      assets: [...Object.values(tokens)],
      minAmountsOut: amountsOut,
      userData: WeightedPoolEncoder.exitExactBPTInForTokensOut(bptBalance),
      toInternalBalance: false,
    });

  const { events: exitEvents } = await exitTx.wait();

  if (exitEvents) {
    console.log(
      exitEvents.find((event: any) => event.event == 'PoolBalanceChanged')
    );
  }
};

const main = async () => {
  await deploy(newPoolParams);
};

main();
