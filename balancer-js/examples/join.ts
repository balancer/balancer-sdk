import dotenv from 'dotenv';
import { JsonRpcProvider } from '@ethersproject/providers';
import {
  BalancerError,
  BalancerErrorCode,
  BalancerSDK,
  Network,
  PoolModel,
} from '../src/index';
import { formatFixed } from '@ethersproject/bignumber';
import { forkSetup } from '../src/test/lib/utils';
import { ADDRESSES } from '../src/test/lib/constants';

dotenv.config();

const { ALCHEMY_URL: jsonRpcUrl } = process.env;

// Slots used to set the account balance for each token through hardhat_setStorageAt
// Info fetched using npm package slot20
const wBTC_SLOT = 0;
const wETH_SLOT = 3;
const slots = [wBTC_SLOT, wETH_SLOT];
const initialBalances = ['1000000000', '100000000000000000000'];

/*
Example showing how to use Pools module to join pools.
*/
async function join() {
  const network = Network.MAINNET;
  const rpcUrl = 'http://127.0.0.1:8545';
  const provider = new JsonRpcProvider(rpcUrl, network);
  const signer = provider.getSigner();
  const signerAddress = await signer.getAddress();

  const poolId =
    '0xa6f548df93de924d73be7d25dc02554c6bd66db500020000000000000000000e'; // 50/50 WBTC/WETH Pool
  const tokensIn = [
    ADDRESSES[network].WBTC?.address,
    ADDRESSES[network].WETH?.address,
  ]; // Tokens that will be provided to pool by joiner
  const amountsIn = ['10000000', '1000000000000000000'];
  const slippage = '100'; // 100 bps = 1%

  const sdkConfig = {
    network,
    rpcUrl,
  };
  const balancer = new BalancerSDK(sdkConfig);

  // Sets up local fork granting signer initial balances and token approvals
  await forkSetup(
    balancer,
    signer,
    tokensIn as string[],
    slots,
    initialBalances,
    jsonRpcUrl as string
  );

  // Use SDK to find pool info
  const pool: PoolModel | undefined = await balancer.poolsProvider.find(poolId);
  if (!pool) throw new BalancerError(BalancerErrorCode.POOL_DOESNT_EXIST);

  // Checking balances to confirm success
  const bptContract = balancer.contracts.ERC20(pool.address, provider);
  const bptBalanceBefore = await bptContract.balanceOf(signerAddress);

  // Use SDK to create join
  const { to, data, minBPTOut } = await pool.buildJoin(
    signerAddress,
    tokensIn as string[],
    amountsIn,
    slippage
  );

  // Submit join tx
  const transactionResponse = await signer.sendTransaction({
    to,
    data,
    // gasPrice: '6000000000', // gas inputs are optional
    // gasLimit: '2000000', // gas inputs are optional
  });

  const transactionReceipt = await transactionResponse.wait();

  const bptBalanceAfter = await bptContract.balanceOf(signerAddress);
  console.log(
    'BPT Balance before joining pool: ',
    formatFixed(bptBalanceBefore, 18)
  );
  console.log(
    'BPT Balance after joining pool: ',
    formatFixed(bptBalanceAfter, 18)
  );
  console.log(
    'Minimum BPT balance expected after join: ',
    formatFixed(minBPTOut, 18)
  );
}

// yarn examples:run ./examples/join.ts
join();
