import { defaultAbiCoder } from '@ethersproject/abi';
import { keccak256 } from '@ethersproject/solidity';
import { BigNumber } from '@ethersproject/bignumber';
import { JsonRpcSigner } from '@ethersproject/providers';
import { getErc20Balance } from '@/test/lib/utils';

export async function findTokenBalanceSlot(
  signer: JsonRpcSigner,
  tokenAddress: string
): Promise<number> {
  const encode = (types: string[], values: any[]): string =>
    defaultAbiCoder.encode(types, values);
  const account = await signer.getAddress();
  const probeA = encode(['uint256'], [(Math.random() * 10000).toFixed()]);
  const probeB = encode(['uint256'], [(Math.random() * 10000).toFixed()]);
  for (let i = 0; i < 100; i++) {
    let probedSlot = keccak256(['uint256', 'uint256'], [account, i]);
    // remove padding for JSON RPC
    while (probedSlot.startsWith('0x0'))
      probedSlot = '0x' + probedSlot.slice(3);
    const prev = await signer.provider.send('eth_getStorageAt', [
      tokenAddress,
      probedSlot,
      'latest',
    ]);
    // make sure the probe will change the slot value
    const probe = prev === probeA ? probeB : probeA;

    await signer.provider.send('hardhat_setStorageAt', [
      tokenAddress,
      probedSlot,
      probe,
    ]);

    const balance = await getErc20Balance(
      tokenAddress,
      signer.provider,
      account
    );
    // reset to previous value
    await signer.provider.send('hardhat_setStorageAt', [
      tokenAddress,
      probedSlot,
      prev,
    ]);
    if (balance.eq(BigNumber.from(probe))) return i;
  }
  throw 'Balances slot not found!';
}
