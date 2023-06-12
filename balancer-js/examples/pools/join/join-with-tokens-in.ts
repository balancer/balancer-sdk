/**
 * Example showing how to use Pools module to join pools.
 * 
 * Run with:
 * yarn example ./examples/pools/join/join.ts
 */
import {
  BalancerSDK,
  Network,
} from '@balancer-labs/sdk'
import { approveToken, getTokenBalance, reset, setTokenBalance } from 'examples/helpers'

async function join() {
  const balancer = new BalancerSDK({
    network: Network.MAINNET,
    rpcUrl: 'http://127.0.0.1:8545', // Using local fork for simulation
  });

  const { provider } = balancer
  const signer = provider.getSigner()
  const address = await signer.getAddress()
  
  // 50/50 WBTC/WETH Pool
  const pool = await balancer.pools.find('0xa6f548df93de924d73be7d25dc02554c6bd66db500020000000000000000000e')
  if (!pool) throw Error('Pool not found')

  // Tokens that will be provided to pool by joiner
  const tokensIn = [
    '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', // WBTC
    '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH
  ];

  // Slots used to set the account balance for each token through hardhat_setStorageAt
  // Info fetched using npm package slot20
  const slots = [0, 3];

  const amountsIn = ['10000000', '1000000000000000000'];

  // Prepare local fork for simulation
  await reset(provider, 17000000)
  await setTokenBalance(provider, address, tokensIn[0], amountsIn[0], slots[0])
  await setTokenBalance(provider, address, tokensIn[1], amountsIn[1], slots[1])
  await approveToken(tokensIn[0], balancer.contracts.vault.address, amountsIn[0], signer)
  await approveToken(tokensIn[1], balancer.contracts.vault.address, amountsIn[1], signer)

  // Checking balances to confirm success
  const tokenBalancesBefore = (await Promise.all(
    tokensIn.map((token) =>
      getTokenBalance(token, address, provider)
    )
  )).map(String)

  // Build join transaction
  const slippage = '100' // 100 bps = 1%
  const { to, data, minBPTOut } = pool.buildJoin(
    address,
    tokensIn,
    amountsIn,
    slippage
  )

  // Calculate price impact
  const priceImpact = await pool.calcPriceImpact(amountsIn, minBPTOut, true)

  // Submit join tx
  const transactionResponse = await signer.sendTransaction({
    to,
    data,
    // gasPrice: '6000000000', // gas inputs are optional
    // gasLimit: '2000000', // gas inputs are optional
  });

  await transactionResponse.wait()

  const tokenBalancesAfter = (await Promise.all(
    tokensIn.map((token) =>
      getTokenBalance(token, address, provider)
    )
  )).map(String)

  console.log('Balances before exit:        ', tokenBalancesBefore);
  console.log('Balances after exit:         ', tokenBalancesAfter);
  console.log('Min BPT expected after exit: ', [minBPTOut.toString()]);
  console.log('Price impact:                ', priceImpact.toString());
}

join()
