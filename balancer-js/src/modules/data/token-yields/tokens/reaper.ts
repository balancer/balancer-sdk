import { Network } from '@/types';
import { AprFetcher } from '../repository';
import { Multicaller } from '@/lib/utils/multiCaller';
import { JsonRpcProvider } from '@ethersproject/providers';
import { BALANCER_NETWORK_CONFIG } from '@/lib/constants/config';

const strategyAbi = [
  {
    inputs: [
      {
        internalType: 'int256',
        name: '_n',
        type: 'int256',
      },
    ],
    name: 'averageAPRAcrossLastNHarvests',
    outputs: [
      {
        internalType: 'int256',
        name: '',
        type: 'int256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
];

export const yieldTokens = {
  DAI: '0x12f256109e744081f633a827be80e06d97ff7447',
  USDT: '0x0179bac7493a92ac812730a4c64a0b41b7ea0ecf',
  USDC: '0xaeacf641a0342330ec681b57c0a6af0b71d5cbff',
};

export const strategiesMap = {
  DAI: '0xd4d5321b04e4832772a4d70e1eed6bcb7402d7ac',
  USDT: '0x8a674ebbe33d6b03825626fa432e9ece888e13b5',
  USDC: '0x6f6c0c5b7af2a326111ba6a9fa4926f7ca3adf44',
};

const noRates = Object.fromEntries(
  Object.values(yieldTokens).map((v) => [v, 0])
);

const provider = new JsonRpcProvider(
  'https://arb1.arbitrum.io/rpc',
  Network.ARBITRUM
);
const config = BALANCER_NETWORK_CONFIG[Network.ARBITRUM];
const multicallAddress = config.addresses.contracts.multicall;
const multicaller = new Multicaller(multicallAddress, provider, strategyAbi);
const contractFetcher = {
  getAprs: async () => {
    Object.keys(strategiesMap).forEach((coin) => {
      multicaller.call(
        coin,
        strategiesMap[coin as keyof typeof strategiesMap],
        'averageAPRAcrossLastNHarvests',
        [3]
      );
    });

    const result = await multicaller.execute();

    return result;
  },
};

/**
 * Fetching and parsing aave APRs from a subgraph
 *
 * @returns APRs for aave tokens
 */
export const reaper: AprFetcher = async (
  network?: Network,
  contract = contractFetcher
) => {
  if (!network || network != Network.ARBITRUM) {
    return noRates;
  }

  try {
    const result = await contract.getAprs();

    const aprEntries = Object.keys(result).map((coin) => [
      yieldTokens[coin as keyof typeof yieldTokens],
      Math.round(Number(result[coin])),
    ]);

    return Object.fromEntries(aprEntries);
  } catch (error) {
    console.log(error);

    return noRates;
  }
};
