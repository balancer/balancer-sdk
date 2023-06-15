import { Network } from '@/types';

export function isEthereumTestnet(chainId: Network): boolean {
  return chainId === Network.GOERLI || chainId === Network.SEPOLIA;
}
