import dotenv from 'dotenv';
import { JsonRpcProvider, JsonRpcSigner } from '@ethersproject/providers';
import {
  BalancerError,
  BalancerErrorCode,
  BalancerSDK,
  Network,
  PoolModel,
} from '../src/index';
import { parseFixed } from '@ethersproject/bignumber';
import { forkSetup } from '../src/test/lib/utils';

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
  const pool: PoolModel | undefined = await balancer.poolsProvider.find(poolId);
  if (!pool) throw new BalancerError(BalancerErrorCode.POOL_DOESNT_EXIST);

  // Sets up local fork granting signer initial balances and token approvals
  await forkSetup(
    balancer,
    signer,
    [pool.address],
    [BPT_SLOT],
    [bptIn],
    jsonRpcUrl as string
  );

  // Checking balances to confirm success
  const tokenBalancesBefore = await tokenBalances(
    balancer,
    signer,
    pool.tokensList
  );

  const { to, data, minAmountsOut } = await pool.buildExitExactBPTIn(
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

  const transactionReceipt = await transactionResponse.wait();

  const tokenBalancesAfter = await tokenBalances(
    balancer,
    signer,
    pool.tokensList
  );

  console.log('Token balances before exit:              ', tokenBalancesBefore);
  console.log('Token balances after exit:               ', tokenBalancesAfter);
  console.log('Min token balances expected after exit:  ', minAmountsOut);
}

const tokenBalances = async (
  balancer: BalancerSDK,
  signer: JsonRpcSigner,
  tokens: string[]
) => {
  let balances: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const tokenContract = balancer.contracts.ERC20(tokens[i], signer.provider);
    const signerAddress = await signer.getAddress();
    balances.push((await tokenContract.balanceOf(signerAddress)).toString());
  }
  return balances;
};

// yarn examples:run ./examples/exitExactBPTIn.ts
exitExactBPTIn();
