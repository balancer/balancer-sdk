export enum Network {
  MAINNET = 1,
  ROPSTEN = 3,
  RINKEBY = 4,
  GOERLI = 5,
  GÖRLI = 5,
  OPTIMISM = 10,
  KOVAN = 42,
  POLYGON = 137,
  ARBITRUM = 42161,
}

export function isEthereumTestnet(chainId: Network): boolean {
  return (
    chainId === Network.GOERLI ||
    chainId === Network.KOVAN ||
    chainId === Network.ROPSTEN ||
    chainId === Network.RINKEBY
  );
}
