import { formatEther, parseEther } from '@ethersproject/units';
import { AddressZero } from '@ethersproject/constants';
import { Interface } from '@ethersproject/abi';
import { Contract } from '@ethersproject/contracts';
import { BigNumber } from '@ethersproject/bignumber';
import { WeightedPoolEncoder } from '@/pool-weighted/encoder';
import { setTokenBalance } from '@/test/lib/utils';
import { JsonRpcProvider, JsonRpcSigner } from '@ethersproject/providers';
import WEIGHTED_POOL_FACTORY_ABI from './weighted_pool_factory.json';
import WEIGHTED_POOL_ABI from './weighted_pool.json';
import { BalancerSDK, Pool } from '@/index';
import { Vault } from '@balancer-labs/typechain';

const WEIGHTED_POOL_FACTORY = '0xcC508a455F5b0073973107Db6a878DdBDab957bC';
const iPool = new Interface(WEIGHTED_POOL_ABI);
const bn = (value: number): BigNumber => parseEther(`${value}`);
const fp = (value: number): string => bn(value).toString();

const rpcUrl = 'http://127.0.0.1:8545';
// const rpcUrl =
//   'https://rpc.tenderly.co/fork/d0879482-9a6a-4da2-b8a4-e50e487cf82d';

const sdk = new BalancerSDK({
  network: 1,
  rpcUrl,
});

const {
  contracts: { vault },
  pools,
} = sdk;

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
const seed = async (
  vault: Vault,
  lp: JsonRpcSigner,
  poolId: string,
  amountsIn: BigNumber[]
) => {
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

  const iERC20 = [
    'function approve(address,uint256) nonpayable',
    'function balanceOf(address) view returns(uint)',
  ];
  const erc20 = new Contract(AddressZero, iERC20);

  // Approve vault for seeder
  await Promise.all(
    Object.values(tokens).map((address) => {
      return erc20.attach(address).connect(lp).approve(vault.address, fp(100));
    })
  );

  // Approve vault for LP
  await Promise.all(
    Object.values(tokens).map((address) => {
      return erc20.attach(address).connect(lp).approve(vault.address, fp(100));
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

const sendTx = async (lp: JsonRpcSigner, to: string, data: string) => {
  const tx = await lp.sendTransaction({ to, data });
  const receipt = await tx.wait();
  const event = receipt.logs.find(
    (log) =>
      log.topics[0] == vault.interface.getEventTopic('PoolBalanceChanged')
  );
  let parsed = {};
  if (event) {
    parsed = vault.interface.parseLog(event);
  }
  return parsed;
};

const getPool = async (
  id: string,
  weights: string[],
  swapFee: string,
  provider: JsonRpcProvider
) => {
  const poolTokens = await vault.getPoolTokens(id);
  const [address] = await vault.getPool(id);
  const pool = new Contract(address, iPool, provider);
  const balances = poolTokens.balances.map(formatEther);
  const tokensList = poolTokens.tokens;
  const totalShares = await pool.totalSupply().then(formatEther);

  return {
    id,
    name: '',
    address,
    poolType: 'Weighted',
    tokensList,
    tokens: [
      ...tokensList.map((address: string, idx: number) => ({
        address,
        decimals: 18,
        balance: balances[idx],
        weight: weights[idx],
      })),
    ],
    totalShares,
    swapFee,
    chainId: 1,
    totalLiquidity: '1',
    swapEnabled: true,
    totalWeight: '1',
  };
};

const main = async () => {
  const provider = sdk.provider as JsonRpcProvider;
  const admin = provider.getSigner(1); // account responsible for pool deployment
  const lp = provider.getSigner(2); // account responsible for providing liquidity

  // New pool definition
  const newPoolParams = {
    name: 'dsETH',
    symbol: 'dsETH',
    tokens: Object.values(tokens),
    normalizedWeights: [0.6, 0.2, 0.2].map(fp),
    rateProviders: Array(TOKEN_COUNT).fill(AddressZero),
    swapFeePercentage: fp(0.01),
    owner: AddressZero,
  };

  const poolId = await deploy(admin, newPoolParams);

  // Liquidity seeding
  // balances needs to be adjusted to rates between tokens to avoid arbitrage
  const balances = [60, 20, 20].map(bn);
  await seed(vault, lp, poolId, balances);

  // SDK works on internal pool data schema, getPool helper function converts to this schema
  let pool = (await getPool(
    poolId,
    newPoolParams.normalizedWeights.map(formatEther),
    formatEther(newPoolParams.swapFeePercentage),
    provider
  )) as Pool;

  // Custom amounts in - may result in price impact
  let controller = pools.controller(pool);
  const lpAddress = await lp.getAddress();
  const assets = newPoolParams.tokens;
  const amountsIn = [10, 10, 10].map(fp);
  const slippage = '100'; // 100 bps = 1%

  // Join execution
  const joinRequest = controller.buildJoin(
    lpAddress,
    assets,
    amountsIn,
    slippage
  );
  const joinLog = await sendTx(lp, joinRequest.to, joinRequest.data);
  console.log(joinLog);

  // Exit
  pool = (await getPool(
    poolId,
    newPoolParams.normalizedWeights.map(formatEther),
    formatEther(newPoolParams.swapFeePercentage),
    provider
  )) as Pool;

  const [address] = await vault.getPool(poolId);
  const poolContract = new Contract(address, iPool, provider);
  controller = pools.controller(pool);

  const bptIn = await poolContract
    .balanceOf(lpAddress)
    .then((b: BigNumber) => b.toString());

  const exitRequest = controller.buildExitExactBPTIn(
    lpAddress,
    bptIn,
    slippage
  );
  const exitLog = await sendTx(lp, exitRequest.to, exitRequest.data);
  console.log(exitLog);
};

main();
