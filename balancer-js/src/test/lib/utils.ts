import { BalancerSDK } from '@/.';
import { JsonRpcSigner } from '@ethersproject/providers';
import { BigNumber } from '@ethersproject/bignumber';
import { balancerVault } from '@/lib/constants/config';
import { hexlify, zeroPad } from '@ethersproject/bytes';
import { keccak256 } from '@ethersproject/solidity';

/**
 * Setup local fork with approved token balance for a given account
 *
 * @param {BalancerSDK}   balancer Balancer SDK required to fetch contracts
 * @param {JsonRpcSigner} signer Account that will have token balance set and approved
 * @param {string[]}      tokens Token addresses which balance will be set and approved
 * @param {number[]}      slots Slot that stores token balance in memory - use npm package `slot20` to identify which slot to provide
 * @param {string[]}      balances Balances in EVM amounts
 * @param {string}        jsonRpcUrl Url with remote node to be forked locally
 * @param {number}        blockNumber Number of the block that the fork will happen
 */
export const forkSetup = async (
  balancer: BalancerSDK,
  signer: JsonRpcSigner,
  tokens: string[],
  slots: number[],
  balances: string[],
  jsonRpcUrl: string,
  blockNumber?: number
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
    await setTokenBalance(signer, tokens[i], slots[i], balances[i]);
    // Approve appropriate allowances so that vault contract can move tokens
    await approveToken(balancer, tokens[i], balances[i], signer);
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
  balance: string
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
  const index = keccak256(
    ['uint256', 'uint256'],
    [signerAddress, slot] // key, slot
  );

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
 * @param {BalancerSDK}   balancer Balancer SDK (used to fetch contracts)
 * @param {string}        token Token address to be approved
 * @param {string}        amount Amount to be approved
 * @param {JsonRpcSigner} signer Account that will have tokens approved
 */
export const approveToken = async (
  balancer: BalancerSDK,
  token: string,
  amount: string,
  signer: JsonRpcSigner
): Promise<boolean> => {
  const tokenContract = balancer.contracts.ERC20(token, signer.provider);
  return await tokenContract.connect(signer).approve(balancerVault, amount);
};

/**
 * Return token balances for given account
 *
 * @param {BalancerSDK}   balancer Balancer SDK (used to fetch ERC20 contracts)
 * @param {string}        tokens Token addresses
 * @param {JsonRpcSigner} signer Account that will have token balances returned
 * @returns               Token balances for given account
 */
export const tokenBalances = async (
  balancer: BalancerSDK,
  signer: JsonRpcSigner,
  tokens: string[]
): Promise<string[]> => {
  const balances: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const tokenContract = balancer.contracts.ERC20(tokens[i], signer.provider);
    const signerAddress = await signer.getAddress();
    balances.push((await tokenContract.balanceOf(signerAddress)).toString());
  }
  return balances;
};
