import { BigNumber, BigNumberish, formatFixed } from '@ethersproject/bignumber';
import { hexlify, zeroPad } from '@ethersproject/bytes';
import { AddressZero, MaxUint256, WeiPerEther } from '@ethersproject/constants';
import {
  JsonRpcProvider,
  JsonRpcSigner,
  TransactionReceipt,
} from '@ethersproject/providers';
import { keccak256 } from '@ethersproject/solidity';
import { formatBytes32String } from '@ethersproject/strings';
import { getOnChainBalances } from '@/modules/sor/pool-data/onChainData';

import {
  PoolWithMethods,
  BalancerError,
  BalancerErrorCode,
  BalancerNetworkConfig,
  Network,
  PoolsSubgraphOnChainRepository,
  Pools,
  BalancerSDK,
  GraphQLArgs,
  GraphQLQuery,
  PoolsSubgraphRepository,
  Pool,
  BALANCER_NETWORK_CONFIG,
} from '@/.';
import { balancerVault } from '@/lib/constants/config';
import { parseEther } from '@ethersproject/units';
import { ERC20 } from '@/modules/contracts/implementations/ERC20';
import { setBalance } from '@nomicfoundation/hardhat-network-helpers';

import { Interface } from '@ethersproject/abi';

const liquidityGaugeAbi = ['function deposit(uint value) payable'];
const liquidityGauge = new Interface(liquidityGaugeAbi);
import { Pools as PoolsProvider } from '@/modules/pools';
import mainnetPools from '../fixtures/pools-mainnet.json';
import polygonPools from '../fixtures/pools-polygon.json';
import { PoolsJsonRepository } from './pools-json-repository';

const jsonPools = {
  [Network.MAINNET]: mainnetPools,
  [Network.POLYGON]: polygonPools,
};

/**
 * Setup local fork with approved token balance for a given account
 *
 * @param signer Account that will have token balance set and approved
 * @param tokens Token addresses which balance will be set and approved
 * @param slots Slot that stores token balance in memory - use npm package `slot20` to identify which slot to provide
 * @param balances Balances in EVM amounts
 * @param jsonRpcUrl Url with remote node to be forked locally
 * @param blockNumber Number of the block that the fork will happen
 */
export const forkSetup = async (
  signer: JsonRpcSigner,
  tokens: string[],
  slots: number[],
  balances: string[],
  jsonRpcUrl: string,
  blockNumber?: number,
  isVyperMapping = false
): Promise<void> => {
  await signer.provider.send('hardhat_reset', [
    {
      forking: {
        jsonRpcUrl,
        blockNumber,
      },
    },
  ]);

  for (let i = 0; i < tokens.length; i++) {
    // Set initial account balance for each token that will be used to join pool
    await setTokenBalance(
      signer,
      tokens[i],
      slots[i],
      balances[i],
      isVyperMapping
    );

    // Approve appropriate allowances so that vault contract can move tokens
    await approveToken(tokens[i], MaxUint256.toString(), signer);
  }
};

/**
 * Set token balance for a given account
 *
 * @param signer Account that will have token balance set
 * @param token Token address which balance will be set
 * @param slot Slot memory that stores balance - use npm package `slot20` to identify which slot to provide
 * @param balance Balance in EVM amount
 */
export const setTokenBalance = async (
  signer: JsonRpcSigner,
  token: string,
  slot: number,
  balance: string,
  isVyperMapping = false
): Promise<void> => {
  const toBytes32 = (bn: BigNumber) => {
    return hexlify(zeroPad(bn.toHexString(), 32));
  };

  const setStorageAt = async (token: string, index: string, value: string) => {
    await signer.provider.send('hardhat_setStorageAt', [token, index, value]);
    await signer.provider.send('evm_mine', []); // Just mines to the next block
  };

  const signerAddress = await signer.getAddress();

  // Get storage slot index
  let index;
  if (isVyperMapping) {
    index = keccak256(
      ['uint256', 'uint256'],
      [slot, signerAddress] // slot, key
    );
  } else {
    index = keccak256(
      ['uint256', 'uint256'],
      [signerAddress, slot] // key, slot
    );
  }

  // Manipulate local balance (needs to be bytes32 string)
  await setStorageAt(
    token,
    index,
    toBytes32(BigNumber.from(balance)).toString()
  );
};

/**
 * Approve token balance for vault contract
 *
 * @param token Token address to be approved
 * @param amount Amount to be approved
 * @param signer Account that will have tokens approved
 */
export const approveToken = async (
  token: string,
  amount: string,
  signer: JsonRpcSigner
): Promise<boolean> => {
  const tokenContract = ERC20(token, signer.provider);
  return await tokenContract.connect(signer).approve(balancerVault, amount);
};

export const setupPool = async (
  provider: PoolsProvider,
  poolId: string
): Promise<PoolWithMethods> => {
  const pool = await provider.find(poolId);
  if (!pool) throw new BalancerError(BalancerErrorCode.POOL_DOESNT_EXIST);
  return pool;
};

export const getErc20Balance = (
  token: string,
  provider: JsonRpcProvider,
  holder: string
): Promise<BigNumber> => ERC20(token, provider).balanceOf(holder);

export const getBalances = async (
  tokens: string[],
  signer: JsonRpcSigner,
  signerAddress: string
): Promise<Promise<BigNumber[]>> => {
  const balances: Promise<BigNumber>[] = [];
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i] === AddressZero) {
      balances[i] = signer.getBalance();
    } else {
      balances[i] = getErc20Balance(tokens[i], signer.provider, signerAddress);
    }
  }
  return Promise.all(balances);
};

export const formatAddress = (text: string): string => {
  if (text.match(/^(0x)?[0-9a-fA-F]{40}$/)) return text; // Return text if it's already a valid address
  return formatBytes32String(text).slice(0, 42);
};

export const formatId = (text: string): string => {
  if (text.match(/^(0x)?[0-9a-fA-F]{64}$/)) return text; // Return text if it's already a valid id
  return formatBytes32String(text);
};

export const move = async (
  token: string,
  from: string,
  to: string,
  provider: JsonRpcProvider
): Promise<BigNumber> => {
  const holder = await impersonateAccount(from, provider);
  const balance = await getErc20Balance(token, provider, from);
  await ERC20(token, provider).connect(holder).transfer(to, balance);

  return balance;
};

// https://hardhat.org/hardhat-network/docs/guides/forking-other-networks#impersonating-accounts
// WARNING: don't use hardhat SignerWithAddress to sendTransactions!!
// It's not working and we didn't have time to figure out why.
// Use JsonRpcSigner instead
export const impersonateAccount = async (
  account: string,
  provider: JsonRpcProvider
): Promise<JsonRpcSigner> => {
  await provider.send('hardhat_impersonateAccount', [account]);
  await setBalance(account, parseEther('10000'));
  return provider.getSigner(account);
};

export const stake = async (
  signer: JsonRpcSigner,
  pool: string,
  gauge: string,
  balance: BigNumber
): Promise<void> => {
  await (
    await ERC20(pool, signer.provider)
      .connect(signer)
      .approve(gauge, MaxUint256)
  ).wait();

  await (
    await signer.sendTransaction({
      to: gauge,
      data: liquidityGauge.encodeFunctionData('deposit', [balance]),
    })
  ).wait();
};

export const accuracy = (
  amount: BigNumber,
  expectedAmount: BigNumber
): number => {
  if (amount.eq(expectedAmount)) return 1;
  if (expectedAmount.eq(0))
    throw new Error("Can't check accuracy for expectedAmount 0");
  const accuracyEvm = amount.mul(WeiPerEther).div(expectedAmount);
  const accuracy = formatFixed(accuracyEvm, 18);
  return parseFloat(accuracy);
};

/**
 * Helper to efficiently retrieve pool state from Subgraph and onChain given a pool id.
 */
export class TestPoolHelper {
  pools: PoolsSubgraphRepository;
  poolsOnChain: PoolsSubgraphOnChainRepository;
  networkConfig: BalancerNetworkConfig;

  constructor(
    private poolId: string,
    network: Network,
    rpcUrl: string,
    blockNumber: number,
    private onChain = true
  ) {
    const subgraphArgs: GraphQLArgs = {
      where: {
        id: {
          eq: poolId,
        },
      },
      block: { number: blockNumber },
    };
    const subgraphQuery: GraphQLQuery = { args: subgraphArgs, attrs: {} };
    const { networkConfig, data } = new BalancerSDK({
      network,
      rpcUrl,
      subgraphQuery,
    });
    this.pools = data.pools;
    this.poolsOnChain = data.poolsOnChain;
    this.networkConfig = networkConfig;
  }

  /**
   * Will retrieve onchain state if onChain was true in constructor.
   * @returns
   */
  async getPool(): Promise<PoolWithMethods> {
    const pool = this.onChain
      ? await this.poolsOnChain.find(this.poolId, true)
      : await this.pools.find(this.poolId);
    if (pool === undefined) throw new Error('Pool Not Found');
    const wrappedPool = Pools.wrap(pool, this.networkConfig);
    return wrappedPool;
  }
}

/**
 * Returns a pool from the json file as a Pool type defined in SubgraphPoolRepository.
 *
 * @param id pool ID
 * @param network we only support 1 and 137
 * @returns Pool as from the SubgraphPoolRepository
 */
export const getPoolFromFile = async (
  id: string,
  network: 1 | 137
): Promise<Pool> => {
  const pool = await new PoolsJsonRepository(jsonPools[network], network).find(
    id
  );
  if (pool === undefined) throw new Error('Pool Not Found');
  return pool;
};

/**
 * Updates pool balances with onchain state.
 *
 * @param pool pool from repository
 * @param network we only support 1, 137 and 42161
 * @returns Pool as from the SubgraphPoolRepository
 */
export const updateFromChain = async (
  pool: Pool,
  network: 1 | 137 | 42161,
  provider: JsonRpcProvider
): Promise<Pool> => {
  const onChainPool = await getOnChainBalances(
    [pool],
    BALANCER_NETWORK_CONFIG[network].addresses.contracts.multicall,
    BALANCER_NETWORK_CONFIG[network].addresses.contracts.vault,
    provider
  );
  return onChainPool[0];
};

export async function sendTransactionGetBalances(
  tokensForBalanceCheck: string[],
  signer: JsonRpcSigner,
  signerAddress: string,
  to: string,
  data: string,
  value?: BigNumberish
): Promise<{
  transactionReceipt: TransactionReceipt;
  balanceDeltas: BigNumber[];
  gasUsed: BigNumber;
}> {
  const balanceBefore = await getBalances(
    tokensForBalanceCheck,
    signer,
    signerAddress
  );
  // Send transaction to local fork
  const transactionResponse = await signer.sendTransaction({
    to,
    data,
    value,
    gasLimit: 30000000,
  });
  const transactionReceipt = await transactionResponse.wait();
  const { gasUsed, effectiveGasPrice } = transactionReceipt;
  const gasPrice = gasUsed.mul(effectiveGasPrice);

  const balancesAfter = await getBalances(
    tokensForBalanceCheck,
    signer,
    signerAddress
  );

  const balanceDeltas = balancesAfter.map((balAfter, i) => {
    // ignore ETH delta from gas cost
    if (tokensForBalanceCheck[i] === AddressZero) {
      balAfter = balAfter.add(gasPrice);
    }
    return balAfter.sub(balanceBefore[i]).abs();
  });

  return {
    transactionReceipt,
    balanceDeltas,
    gasUsed,
  };
}
