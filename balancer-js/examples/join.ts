import dotenv from 'dotenv';
import { Wallet } from '@ethersproject/wallet';
import { JsonRpcProvider } from '@ethersproject/providers';
import { BalancerSDK, Network, PoolModel } from '../src/index';
import { formatFixed, parseFixed } from '@ethersproject/bignumber';
import { setTokenBalance, approveToken } from '../src/test/lib/utils';

dotenv.config();

const { ALCHEMY_URL: jsonRpcUrl } = process.env;

// Slots used to set the account balance for each token through hardhat_setStorageAt
// Info fetched using npm package slot20
const wBTC_SLOT = 0;
const wETH_SLOT = 3;
const slots = [wBTC_SLOT, wETH_SLOT];

/*
Example showing how to use Pools module to join pools.
*/
async function join() {
  const config = {
    network: Network.MAINNET,
    rpcUrl: 'http://127.0.0.1:8545',
  };

  // Public test account with 10000 ETH
  // publicKey = '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266';
  const privateKey =
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
  const provider = new JsonRpcProvider(config.rpcUrl, config.network);
  const wallet = new Wallet(privateKey, provider);

  await provider.send('hardhat_reset', [
    {
      forking: {
        jsonRpcUrl,
        blockNumber: 14717479, // holds same state static repository
      },
    },
  ]);

  // B_50WBTC_50WETH pool on mainnet https://etherscan.io/address/0xa6f548df93de924d73be7d25dc02554c6bd66db5
  const poolId =
    '0xa6f548df93de924d73be7d25dc02554c6bd66db500020000000000000000000e'; // B_50WBTC_50WETH
  const slippage = '100'; // 100 bps = 1%

  const balancer = new BalancerSDK(config);
  const pool: PoolModel | undefined = await balancer.poolsProvider.find(poolId);
  if (!pool) throw new Error('Pool not found');

  for (let i = 0; i < pool.tokensList.length; i++) {
    const token = pool.tokens[i];
    const balance = parseFixed('100000', token.decimals).toString();
    // Set initial account balance for each token that will be used to join pool
    await setTokenBalance(
      provider.getSigner(),
      token.address,
      slots[i],
      balance
    );
    // Approve appropriate allowances so that vault contract can move tokens
    await approveToken(balancer, token.address, balance, provider.getSigner());
  }

  const amountsIn = pool.tokens.map((t) =>
    parseFixed(t.balance, t.decimals).div('100000').toString()
  );

  const bptContract = balancer.contracts.ERC20(pool.address, provider);
  const bptBalanceBefore = await bptContract.balanceOf(wallet.address);

  const { to, data, minBPTOut } = await pool.buildJoin(
    wallet.address,
    pool.tokensList,
    amountsIn,
    slippage
  );

  const transactionResponse = await wallet.sendTransaction({
    to,
    data,
    // gasPrice: '6000000000', // gas inputs are optional
    // gasLimit: '2000000', // gas inputs are optional
  });

  const transactionReceipt = await transactionResponse.wait();

  const bptBalanceAfter = await bptContract.balanceOf(wallet.address);
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
