import dotenv from 'dotenv';
import { JsonRpcProvider } from '@ethersproject/providers';
import {
  BalancerError,
  BalancerErrorCode,
  BalancerSDK,
  Network,
  PoolWithMethods,
} from '../src/index';
import { forkSetup, getBalances } from '../src/test/lib/utils';
import { ADDRESSES } from '../src/test/lib/constants';
import { BigNumber } from '@ethersproject/bignumber';

dotenv.config();

const { ALCHEMY_URL: jsonRpcUrl } = process.env;

// Slots used to set the account balance for each token through hardhat_setStorageAt
// Info fetched using npm package slot20
const BPT_SLOT = 0;

/*
Example showing how to use Pools module to exit pools with exact tokens out method.
*/
async function exitExactTokensOut() {
  const network = Network.MAINNET;
  const rpcUrl = 'http://127.0.0.1:8545';
  const provider = new JsonRpcProvider(rpcUrl, network);
  const signer = provider.getSigner();
  const signerAddress = await signer.getAddress();

  const poolId =
    '0xa6f548df93de924d73be7d25dc02554c6bd66db500020000000000000000000e'; // 50/50 WBTC/WETH Pool
  const slippage = '200'; // 200 bps = 2%

  const sdkConfig = {
    network,
    rpcUrl,
  };
  const balancer = new BalancerSDK(sdkConfig);

  // Use SDK to find pool info
  const pool: PoolWithMethods | undefined = await balancer.pools.find(poolId);
  if (!pool) throw new BalancerError(BalancerErrorCode.POOL_DOESNT_EXIST);

  const tokensOut = [
    ADDRESSES[network].WBTC?.address,
    ADDRESSES[network].WETH?.address,
  ]; // Tokens that will be provided to pool by joiner
  const amountsOut = ['10000000', '1000000000000000000'];

  const { to, data, maxBPTIn } = pool.buildExitExactTokensOut(
    signerAddress,
    tokensOut as string[],
    amountsOut,
    slippage
  );

  // Sets up local fork granting signer initial balances and token approvals
  await forkSetup(
    signer,
    [pool.address],
    [BPT_SLOT],
    [maxBPTIn],
    jsonRpcUrl as string
  );

  // Checking balances to confirm success
  const tokenBalancesBefore = (
    await getBalances([pool.address, ...pool.tokensList], signer, signerAddress)
  ).map((b) => b.toString());

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

  console.log('Balances before exit:                 ', tokenBalancesBefore);
  console.log('Balances after exit:                  ', tokenBalancesAfter);
  console.log('Max BPT input:                        ', [maxBPTIn.toString()]);
  console.log('Actual BPT input:                     ', [
    BigNumber.from(tokenBalancesBefore[0])
      .sub(BigNumber.from(tokenBalancesAfter[0]))
      .toString(),
  ]);
}

// yarn examples:run ./examples/exitExactTokensOut.ts
exitExactTokensOut();
