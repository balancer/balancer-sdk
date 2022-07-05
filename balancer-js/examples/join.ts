import dotenv from 'dotenv';
import { Wallet } from '@ethersproject/wallet';
import { JsonRpcProvider } from '@ethersproject/providers';
import {
  BalancerSDK,
  BalancerSdkConfig,
  Network,
  Pool,
  StaticPoolRepository,
} from '../src/index';
import { USDC, WETH } from './constants';
import { parseFixed } from '@ethersproject/bignumber';
import { PoolsProvider } from '../src/modules/pools/provider';
import KOVAN_POOLS from '../src/test/lib/kovan-pools.json';

dotenv.config();

/*
Example showing how to use Pools module to join pools with exact tokens in method.
*/
async function join() {
  const config: BalancerSdkConfig = {
    network: Network.KOVAN,
    rpcUrl: `https://kovan.infura.io/v3/${process.env.INFURA}`,
  };

  const provider = new JsonRpcProvider(config.rpcUrl);
  const key: any = process.env.TRADER_KEY;
  const wallet = new Wallet(key, provider);

  const balancer = new BalancerSDK(config);

  // BAL50-WETH50 pool on kovan https://kovan.etherscan.io/address/0x3A19030Ed746bD1C3f2B0f996FF9479aF04C5F0A
  const poolId =
    '0x3a19030ed746bd1c3f2b0f996ff9479af04c5f0a000200000000000000000004';
  const tokensIn = [USDC.address, WETH.address];
  const amountsIn = [
    parseFixed('1000', USDC.decimals).toString(), // in EVM amounts
    parseFixed('0.0404635786916841', WETH.decimals).toString(), // in EVM amounts
  ];
  const slippage = '100'; // 100 bps = 1%

  const staticRepository = new StaticPoolRepository(KOVAN_POOLS as Pool[]);
  const pools = new PoolsProvider(staticRepository, config);
  const pool = await pools.find(poolId);
  if (!pool) {
    throw new Error('no pool');
  }
  const { to, data } = await pool.buildJoin(
    wallet.address,
    tokensIn,
    amountsIn,
    slippage
  );

  const tx = await wallet.call({
    data,
    to,
    // gasPrice: '6000000000', // gas inputs are optional
    // gasLimit: '2000000', // gas inputs are optional
  });

  console.log(tx);
}

// yarn examples:run ./examples/join.ts
join();
