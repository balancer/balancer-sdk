/**
 * Example of getting nested pool tokens data from Balancer helper contract
 * 
 * Usage:
 * yarn example ./examples/data/nested-pools.ts
 */
import { JsonRpcProvider } from '@ethersproject/providers'
import { PoolGraph, GraphPool } from '../../src/modules/graph/graph'
import { Vault__factory, ERC20__factory, HelperPoolToken, HelperPoolTokenRepository, PoolsSubgraphRepository, Relayer } from '@/index'
import { Join } from '../../src/modules/joins/buildJoin'
import { networkAddresses } from '@/lib/constants/config'
import { formatEther, parseEther } from '@ethersproject/units'
import { approveToken, setTokenBalance } from 'examples/helpers'
import { impersonateAccount } from '@/test/lib/utils'
import { Contract } from '@ethersproject/contracts'

const provider = new JsonRpcProvider('http://localhost:8545')
// const provider = new JsonRpcProvider('https://rpc.vnet.tenderly.co/devnet/my-first-devnet/23282aa0-e4d1-49cf-bec2-55ec82aea303')
// const provider = new JsonRpcProvider('https://rpc.tenderly.co/fork/1cf7833c-03ca-4af8-bf8e-3095f52f71c3')


const helperRepo = new HelperPoolTokenRepository({
  helperAddress: '0x94786ad8ffa9fc3fdd7bde6d988c92f22cd58193',
  provider
})

const subgraphRepo = new PoolsSubgraphRepository({
  url: 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-v2',
  chainId: 1
})

const poolId = '0xfebb0bbf162e64fb9d0dfe186e517d84c395f016000000000000000000000502'
const poolAddress = '0xfebb0bbf162e64fb9d0dfe186e517d84c395f016'

const poolGraph = new PoolGraph(subgraphRepo)

function buildGraphPools(tokens: HelperPoolToken[]): GraphPool[] {
  return tokens.filter((t) => t.pool).map(({ parentId, address, pool })=>  {
    if (!pool || pool.id === '0x0000000000000000000000000000000000000000000000000000000000000000') {
      return null
    }

    const poolTokens = tokens.filter((t) => t.parentId === parentId)
    const tokensList = poolTokens.map((t) => t.address)
    const mainIndex = tokensList.indexOf(pool!.mainToken)
    const wrappedIndex = tokensList.findIndex((t, i) => i !== mainIndex && !parentId.includes(t))

    return {
      id: parentId,
      address,
      swapFee: String(pool.swapFee),
      poolType: pool.version.name.replace('Pool', ''),
      poolTypeVersion: pool.version.version,
      tokensList,
      totalShares: String(pool.totalSupply),
      wrappedIndex,
      mainIndex,
      tokens: poolTokens.map(({
        address,
        balance,
        decimals,
        weight,
        priceRate,
      }) => ({
        address,
        balance: String(balance),
        decimals: Number(decimals),
        priceRate: String(priceRate),
        weight: String(weight),
      }))
    }
  }).filter((p) => p !== null) as GraphPool[]
}

function buildTree(tokens: HelperPoolToken[], parentId: string): HelperPoolToken[] {
  const list = tokens
    .filter(t => t.parentId === parentId)
    .map(({
      parentId,
      address,
      balance,
      decimals,
      weight,
      priceRate,
      pool,
    }) => ({
      parentId,
      address,
      balance,
      decimals,
      weight,
      priceRate,
      pool,
      tokens: [] as HelperPoolToken[]
    }))

  for (const idx in list) {
    // nested BPTs
    if (list[idx].pool && list[idx].parentId !== list[idx].pool!.id) {
      list[idx].tokens = buildTree(tokens, list[idx].pool!.id)
    }
  }

  return list
}

const main = async () => {
  const signer = provider.getSigner()
  const address = await signer.getAddress()

  const tokens = await helperRepo.find(poolId)
  // console.log(JSON.stringify(tokens, null, 2))

  // Deconstructing the result into a tree structure
  // const tree = buildTree(tokens, poolId)
  // console.log(JSON.stringify(tree, null, 2))

  // Deconstructing the result into a graph structure
  const graphPools = buildGraphPools(tokens)
  // console.log(graphPools.length, graphPools.map(p => p.id), graphPools.map(p => p.tokensList.length))

  // const pg = await poolGraph.idToGraphPoolToken(poolId)
  // console.log(JSON.stringify(pg, null, 2))

  // const pools = await poolGraph.findPools(poolId)
  // console.log(pools.length, pools.map(p => p.id)) 

  const nodes = await poolGraph.getGraphNodes(true, poolId, [], graphPools)

  // console.log(JSON.stringify(
  //   nodes.map(
  //     ({
  //       id,
  //       address,
  //       joinAction,
  //       exitAction,
  //       children
  //     }) => ({ address, id, joinAction, exitAction, children: children.length })), null, 2))

  // Build join
  const { tokens: { wrappedNativeAsset }, contracts: { balancerRelayer, vault } } = networkAddresses(1)
  const joinService = new Join(balancerRelayer, wrappedNativeAsset)

  // Approve relayer
  await (await Vault__factory.connect(vault, signer).setRelayerApproval(address, balancerRelayer, false)).wait()
  const signature = await Relayer.signRelayerApproval(balancerRelayer, address, signer, Vault__factory.connect(vault, provider));

  const { to, data, value, queryCall } = await joinService.buildJoin({
    orderedNodes: nodes,
    tokensIn: ['0x6B175474E89094C44Da98b954EedeAC495271d0F'],
    amountsIn: [String(parseEther('1000'))],
    userAddress: address,
    authorisation: signature
  })

  // console.log(to, data)

  // Topup DAI for the user
  await setTokenBalance(provider, address, '0x6B175474E89094C44Da98b954EedeAC495271d0F', String(parseEther('1000')), 2)
  await approveToken('0x6B175474E89094C44Da98b954EedeAC495271d0F', vault, String(parseEther('1000')), signer)

  // Before balance
  const before = await ERC20__factory.connect(poolAddress, provider).balanceOf(address)

  const query = await signer.call({ to, data: queryCall })

  // Relayer needs to be approved by governance
  // const setApprovalRole = '0x7b8a1d293670124924a0f532213753b89db10bde737249d4540e9a03657d1aff'
  // const authorizerAddress =  '0xA331D84eC860Bf466b4CdCcFb4aC09a1B43F3aE6'
  // const iAuthorizer = ['function grantRole(bytes32 role, address account) external']
  // const admin = await impersonateAccount('0x10A19e7eE7d7F8a52822f6817de8ea18204F2e4f', provider)
  // const authorizer = new Contract(authorizerAddress, iAuthorizer, admin)
  // await authorizer.grantRole(setApprovalRole, balancerRelayer);

  await (await signer.sendTransaction({ to, data, value })).wait()

  // After
  const after = await ERC20__factory.connect(poolAddress, provider).balanceOf(address)

  // Query for min BPT out - it's the last one
  console.log(formatEther(before.toString()), formatEther(after.toString()))
  const resultsDecoded = Relayer.decodeMulticallResult(query)
  const minBPT = resultsDecoded[resultsDecoded.length - 1]
  console.log( minBPT.toString(), formatEther(minBPT.toString()))
}

main()