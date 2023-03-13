// yarn examples:run ./examples/recoveryExit.ts
import dotenv from 'dotenv';
import { BigNumber, parseFixed } from '@ethersproject/bignumber';
import { JsonRpcProvider } from '@ethersproject/providers';

import {
  BalancerError,
  BalancerErrorCode,
  BalancerSDK,
  getPoolAddress,
  GraphQLArgs,
  GraphQLQuery,
  Network,
  PoolWithMethods,
  truncateAddresses,
} from '../src/index';
import { forkSetup, sendTransactionGetBalances } from '../src/test/lib/utils';
import { subSlippage } from '@/lib/utils/slippageHelper';

dotenv.config();

const { ALCHEMY_URL: jsonRpcUrl } = process.env;

// Slots used to set the account balance for each token through hardhat_setStorageAt
// Info fetched using npm package slot20
const BPT_SLOT = 0;

/*
Example showing how to use Pools module to exit pools with exact BPT in method.
*/
async function recoveryExit() {
  const network = Network.MAINNET;
  const rpcUrl = 'http://127.0.0.1:8545';
  const provider = new JsonRpcProvider(rpcUrl, network);
  const signer = provider.getSigner();
  const signerAddress = await signer.getAddress();
  const blockNumber = 16819888;

  const poolId =
    '0x50cf90b954958480b8df7958a9e965752f62712400000000000000000000046f'; // bb-e-usd
  // '0xd4e7c1f3da1144c9e2cfd1b015eda7652b4a439900000000000000000000046a'; // bb-e-usdc
  const bptIn = parseFixed('1', 18).toString();
  const slippage = '200'; // 200 bps = 2%

  const subgraphArgs: GraphQLArgs = {
    where: {
      address: {
        in: [getPoolAddress(poolId)],
      },
    },
    orderBy: 'totalLiquidity',
    orderDirection: 'desc',
    block: { number: blockNumber },
  };
  const subgraphQuery: GraphQLQuery = { args: subgraphArgs, attrs: {} };

  const sdkConfig = {
    network,
    rpcUrl,
    subgraphQuery,
  };
  const balancer = new BalancerSDK(sdkConfig);

  // Use SDK to find pool info
  const pool: PoolWithMethods | undefined = await balancer.pools.find(poolId);
  if (!pool) throw new BalancerError(BalancerErrorCode.POOL_DOESNT_EXIST);

  // Sets up local fork granting signer initial balances and token approvals
  await forkSetup(
    signer,
    [pool.address],
    [BPT_SLOT],
    [bptIn],
    jsonRpcUrl as string,
    blockNumber
  );

  let minAmountsOut = Array(pool.tokensList.length).fill('0');

  const { attributes } = pool.recoveryExit(
    signerAddress,
    signerAddress,
    bptIn,
    minAmountsOut
  );

  const { amountsOut } =
    await balancer.contracts.balancerHelpers.callStatic.queryExit(
      attributes.poolId,
      attributes.sender,
      attributes.recipient,
      attributes.exitPoolRequest
    );

  minAmountsOut = amountsOut.map((amount) =>
    subSlippage(amount, BigNumber.from(slippage)).toString()
  );

  const { to, data } = pool.recoveryExit(
    signerAddress,
    signerAddress,
    bptIn,
    minAmountsOut
  );

  const { balanceDeltas } = await sendTransactionGetBalances(
    pool.tokensList,
    signer,
    signerAddress,
    to,
    data
  );

  console.table({
    tokensOut: truncateAddresses(pool.tokensList),
    minAmountsOut: minAmountsOut,
    expectedAmountsOut: amountsOut,
    balanceDeltas: balanceDeltas.map((b) => b.toString()),
  });
}

recoveryExit();
