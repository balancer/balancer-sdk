import { BigNumber } from '@ethersproject/bignumber';
import { hexlify, zeroPad } from '@ethersproject/bytes';
import { AddressZero, MaxUint256 } from '@ethersproject/constants';
import { JsonRpcProvider, JsonRpcSigner } from '@ethersproject/providers';
import { keccak256 } from '@ethersproject/solidity';
import { formatBytes32String } from '@ethersproject/strings';

import { PoolWithMethods, BalancerError, BalancerErrorCode } from '@/.';
import { balancerVault } from '@/lib/constants/config';
import { parseEther } from '@ethersproject/units';
import { ERC20 } from '@/modules/contracts/implementations/ERC20';
import { setBalance } from '@nomicfoundation/hardhat-network-helpers';

import { Interface } from '@ethersproject/abi';
const liquidityGaugeAbi = ['function deposit(uint value) payable'];
const liquidityGauge = new Interface(liquidityGaugeAbi);
import { Pools as PoolsProvider } from '@/modules/pools';

/**
 * Setup local fork with approved token balance for a given account
 *
 * @param {JsonRpcSigner} signer Account that will have token balance set and approved
 * @param {string[]}      tokens Token addresses which balance will be set and approved
 * @param {number[]}      slots Slot that stores token balance in memory - use npm package `slot20` to identify which slot to provide
 * @param {string[]}      balances Balances in EVM amounts
 * @param {string}        jsonRpcUrl Url with remote node to be forked locally
 * @param {number}        blockNumber Number of the block that the fork will happen
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
 * @param {JsonRpcSigner} signer Account that will have token balance set
 * @param {string}        token Token address which balance will be set
 * @param {number}        slot Slot memory that stores balance - use npm package `slot20` to identify which slot to provide
 * @param {string}        balance Balance in EVM amounts
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
 * @param {string}        token Token address to be approved
 * @param {string}        amount Amount to be approved
 * @param {JsonRpcSigner} signer Account that will have tokens approved
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
