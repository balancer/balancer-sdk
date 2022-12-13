/**
 * Shows how to query balancer helper contracts for
 * expected amounts when providing or exiting liquidity from pools
 * 
 * yarn examples:run ./examples/pools/queries.ts
 */

import { parseEther, formatEther } from '@ethersproject/units'
import { BalancerSDK, PoolWithMethods } from '@/.'

const sdk = new BalancerSDK({
  network: 1,
  rpcUrl: 'https://eth-rpc.gateway.pokt.network',
})

const { pools, balancerContracts: contracts } = sdk;

// Joining with a single token
const queryJoin = async (pool: PoolWithMethods) => {
  const token = pool.tokensList[0]
  const joinExactInQuery = pool.buildQueryJoinExactIn({
    maxAmountsIn: pool.tokensList.map((t) => parseEther((t === token) ? '1' : '0'))
  })

  const response = await contracts.balancerHelpers.queryJoin(...joinExactInQuery)

  console.log(`Joining ${pool.poolType}`)
  console.table({
    tokens: pool.tokensList.map((t) => `${t.slice(0, 6)}...${t.slice(38, 42)}`),
    amountsIn: response.amountsIn.map(formatEther),
    bptOut: formatEther(response.bptOut),
  });  
}

// Exiting to single token
const queryExit = async (pool: PoolWithMethods) => {
  const exitToSingleToken = pool.buildQueryExitToSingleToken({
    bptIn: parseEther('1'),
    tokenOut: pool.tokensList[0]
  })

  const response = await contracts.balancerHelpers.queryExit(...exitToSingleToken)

  console.log(`Exiting ${pool.poolType}`)
  console.table({
    tokens: pool.tokensList.map((t) => `${t.slice(0, 6)}...${t.slice(38, 42)}`),
    amountsOut: response.amountsOut.map(formatEther),
    bptIn: formatEther(response.bptIn),
  })
}


(async () => {
  const composableStable = await pools.find('0xa13a9247ea42d743238089903570127dda72fe4400000000000000000000035d')
  const weighted = await pools.find('0x25accb7943fd73dda5e23ba6329085a3c24bfb6a000200000000000000000387')
  const metaStable = await pools.find('0x32296969ef14eb0c6d29669c550d4a0449130230000200000000000000000080')

  for (const pool of [composableStable, weighted, metaStable]) {
    await queryJoin(pool!)
    await queryExit(pool!)
  }
})()
