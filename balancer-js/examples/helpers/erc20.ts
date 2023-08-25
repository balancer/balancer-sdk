import { hexlify, zeroPad } from '@ethersproject/bytes';
import { keccak256 } from '@ethersproject/solidity';
import { BigNumber } from '@ethersproject/bignumber';
import { Contract } from '@ethersproject/contracts';
import { JsonRpcProvider, JsonRpcSigner } from '@ethersproject/providers';

/**
 * Set token balance for a given account
 *
 * @param provider JsonRpcProvider
 * @param account Account that will have token balance set
 * @param token Token address which balance will be set
 * @param balance Balance in EVM amount
 * @param slot Slot memory that stores balance - use npm package `slot20` to identify which slot to provide
 * @param isVyperMapping If token is a Vyper contract, set to true
 */
export const setTokenBalance = async (
  provider: JsonRpcProvider,
  account: string,
  token: string,
  balance: string,
  slot: number,
  isVyperMapping = false
): Promise<void> => {
  // Get storage slot index
  const slotFormat = isVyperMapping ? [slot, account] : [account, slot];
  const slotValue = keccak256(['uint256', 'uint256'], slotFormat);

  // Manipulate local balance (needs to be bytes32 string)
  const value = hexlify(
    zeroPad(BigNumber.from(String(BigInt(balance))).toHexString(), 32)
  );

  await provider.send('hardhat_setStorageAt', [token, slotValue, value]);
};

/**
 * Approve token balance for vault contract
 *
 * @param token Token address to be approved
 * @param spender Token spender address to be approved
 * @param amount Amount to be approved
 * @param signer Account that will have tokens approved
 */
export const approveToken = async (
  token: string,
  spender: string,
  amount: string,
  signer: JsonRpcSigner
): Promise<boolean> => {
  const iERC20 = [
    'function approve(address spender, uint256 amount) external returns (bool)',
  ];
  const erc20 = new Contract(token, iERC20, signer);
  const txReceipt = await (await erc20.approve(spender, amount)).wait();
  return txReceipt.status === 1;
};

/**
 * Get ERC20 token balance for a given account
 *
 * @param token Token address to get balance of
 * @param account Account to get balance for
 * @param provider JsonRpcProvider
 * @returns Token balance
 */
export const getTokenBalance = async (
  token: string,
  account: string,
  provider: JsonRpcProvider
): Promise<string> => {
  const iERC20 = [
    'function balanceOf(address account) external view returns (uint256)',
  ];
  const erc20 = new Contract(token, iERC20, provider);
  return erc20.balanceOf(account);
};

export const getNativeAssetBalance = async (
  account: string,
  provider: JsonRpcProvider
): Promise<string> => {
  return BigNumber.from(
    await provider.send('eth_getBalance', [account, 'latest'])
  ).toString();
};
