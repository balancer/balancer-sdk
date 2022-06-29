import dotenv from 'dotenv';
import { Wallet } from '@ethersproject/wallet';
import { InfuraProvider } from '@ethersproject/providers';
import { BalancerSDK, BalancerSdkConfig, Network, SeedToken } from '../src/index';
import { DAI } from './constants';

dotenv.config();

const { TRADER_KEY } = process.env;

export interface tokens {
  [name: string]: {
    address: string;
    decimals: number;
  };
}
const POOL_OWNER = "0x1111111111111111111111111111111111111111"

const namedTokens: tokens = {
  wETH: {
    address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    decimals: 18,
  },
  wBTC: {
    address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
    decimals: 8,
  },
};
const SEED_TOKENS: Array<SeedToken> = [ 
    { id: 0, tokenAddress: namedTokens.wBTC.address, weight: 30, amount: "200000000" }, 
    { id: 1, tokenAddress: namedTokens.wETH.address, weight: 40, amount: "200000000" },
    { id: 2, tokenAddress: DAI.address, weight: 30, amount: "200000000" } 
]

/*
create a weighted liquidity pool with the factory contract
*/
async function createWeightedPool() {

  const sdkConfig: BalancerSdkConfig = {
    network: Network.KOVAN,
    rpcUrl: `https://kovan.infura.io/v3/${process.env.INFURA}`,
  };
  const balancer = new BalancerSDK(sdkConfig);

  const { data, to: wPoolFactoryContractAddress } = await balancer.pools.weighted.buildCreateTx({
    // Pool name
    name: "WeightedPoolFactoryExample",
    symbol: "30wBTC-40wETH-30wDAI",

    // How much of a swap fee the pool collects
    initialFee: "0.1",

    // A numerically sorted array of all tokens in the pool
    seedTokens: SEED_TOKENS,

    // The "owner" of the pool: account that has some limited control over pool parameters
    // If you want static fees, you should set the fee you want the pool to have forever,
    // and set the owner to the zero address 0x0000000000000000000000000000000000000000.
    owner: POOL_OWNER,
    value: "0.1",
  });
  const provider = new InfuraProvider(Network.KOVAN, process.env.INFURA);
  const wallet = new Wallet(TRADER_KEY as string, provider);

  const tx = await wallet.sendTransaction({
    data,
    to: wPoolFactoryContractAddress,
    /**
     * The following gas inputs are optional,
     **/
    // gasPrice: '6000000000',
    // gasLimit: '2000000',
  });

  const createdPoolInfo = await balancer.pools.getPoolInfoFromCreateTx(tx);
  console.log({ createdPoolInfo })

  const INIT_JOIN_PARAMS = {
    poolId: createdPoolInfo.id,
    sender: "0x0000000000000000000000000000000000000001",
    receiver: createdPoolInfo.address,
    tokenAddresses: [DAI.address, namedTokens.wBTC.address, namedTokens.wETH.address],
    initialBalancesString: ["3000000000000000000", "4000000000000000000", "3000000000000000000"],
  }
  const { to, data: initJoinRawData } = await balancer.pools.weighted.buildInitJoin(INIT_JOIN_PARAMS);
  const initJoinTx = wallet.sendTransaction({
    to,
    data: initJoinRawData,
  })
  console.log({ initJoinTx })
}

// yarn examples:run ./examples/batchSwap.ts
createWeightedPool();
