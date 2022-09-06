import dotenv from 'dotenv';
import { JsonRpcProvider } from '@ethersproject/providers';
import {
  BalancerError,
  BalancerErrorCode,
  BalancerSDK,
  Network,
  PoolWithMethods,
} from '../src/index';
import { parseFixed } from '@ethersproject/bignumber';
import { forkSetup, getBalances } from '../src/test/lib/utils';

dotenv.config();

const { ALCHEMY_URL: jsonRpcUrl } = process.env;

// Slots used to set the account balance for each token through hardhat_setStorageAt
// Info fetched using npm package slot20
const BPT_SLOT = 0;

/*
Example showing how to use Pools module to exit pools with exact BPT in method.
*/
async function exitExactBPTIn() {
  const network = Network.MAINNET;
  const rpcUrl = 'http://127.0.0.1:8545';
  const provider = new JsonRpcProvider(rpcUrl, network);
  const signer = provider.getSigner();
  const signerAddress = await signer.getAddress();

  const poolId =
    '0xa6f548df93de924d73be7d25dc02554c6bd66db500020000000000000000000e'; // 50/50 WBTC/WETH Pool
  const bptIn = parseFixed('1', 18).toString();
  const slippage = '200'; // 200 bps = 2%

  const sdkConfig = {
    network,
    rpcUrl,
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
    jsonRpcUrl as string
  );

  // Checking balances to confirm success
  const tokenBalancesBefore = (
    await getBalances([pool.address, ...pool.tokensList], signer, signerAddress)
  ).map((b) => b.toString());

  const { to, data, minAmountsOut } = pool.buildExitExactBPTIn(
    signerAddress,
    bptIn,
    slippage
  );

  // Submit exit tx
  const transactionResponse = await signer.sendTransaction({
    to,
    data,
    // gasPrice: '6000000000', // gas inputs are optional
    // gasLimit: '2000000', // gas inputs are optional
  });

  await transactionResponse.wait();

  const tokenBalancesAfter = (
    await getBalances([pool.address, ...pool.tokensList], signer, signerAddress)
  ).map((b) => b.toString());

  console.log('Balances before exit:             ', tokenBalancesBefore);
  console.log('Balances after exit:              ', tokenBalancesAfter);
  console.log(
    'Min balances expected after exit: ',
    minAmountsOut.map((a) => a.toString())
  );
}

// yarn examples:run ./examples/exitExactBPTIn.ts
exitExactBPTIn();
