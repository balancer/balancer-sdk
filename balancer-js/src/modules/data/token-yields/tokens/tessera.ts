import { AprFetcher } from '../repository';
import { JsonRpcProvider } from '@ethersproject/providers';
import { Contract } from '@ethersproject/contracts';

const poolAddress = '0x5954aB967Bc958940b7EB73ee84797Dc8a2AFbb9';
const poolAbi = [
  {
    inputs: [],
    name: 'getPoolsUI',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'poolId', type: 'uint256' },
          { internalType: 'uint256', name: 'stakedAmount', type: 'uint256' },
          {
            components: [
              {
                internalType: 'uint48',
                name: 'startTimestampHour',
                type: 'uint48',
              },
              {
                internalType: 'uint48',
                name: 'endTimestampHour',
                type: 'uint48',
              },
              {
                internalType: 'uint96',
                name: 'rewardsPerHour',
                type: 'uint96',
              },
              {
                internalType: 'uint96',
                name: 'capPerPosition',
                type: 'uint96',
              },
            ],
            internalType: 'struct ApeCoinStaking.TimeRange',
            name: 'currentTimeRange',
            type: 'tuple',
          },
        ],
        internalType: 'struct ApeCoinStaking.PoolUI',
        name: '',
        type: 'tuple',
      },
      {
        components: [
          { internalType: 'uint256', name: 'poolId', type: 'uint256' },
          { internalType: 'uint256', name: 'stakedAmount', type: 'uint256' },
          {
            components: [
              {
                internalType: 'uint48',
                name: 'startTimestampHour',
                type: 'uint48',
              },
              {
                internalType: 'uint48',
                name: 'endTimestampHour',
                type: 'uint48',
              },
              {
                internalType: 'uint96',
                name: 'rewardsPerHour',
                type: 'uint96',
              },
              {
                internalType: 'uint96',
                name: 'capPerPosition',
                type: 'uint96',
              },
            ],
            internalType: 'struct ApeCoinStaking.TimeRange',
            name: 'currentTimeRange',
            type: 'tuple',
          },
        ],
        internalType: 'struct ApeCoinStaking.PoolUI',
        name: '',
        type: 'tuple',
      },
      {
        components: [
          { internalType: 'uint256', name: 'poolId', type: 'uint256' },
          { internalType: 'uint256', name: 'stakedAmount', type: 'uint256' },
          {
            components: [
              {
                internalType: 'uint48',
                name: 'startTimestampHour',
                type: 'uint48',
              },
              {
                internalType: 'uint48',
                name: 'endTimestampHour',
                type: 'uint48',
              },
              {
                internalType: 'uint96',
                name: 'rewardsPerHour',
                type: 'uint96',
              },
              {
                internalType: 'uint96',
                name: 'capPerPosition',
                type: 'uint96',
              },
            ],
            internalType: 'struct ApeCoinStaking.TimeRange',
            name: 'currentTimeRange',
            type: 'tuple',
          },
        ],
        internalType: 'struct ApeCoinStaking.PoolUI',
        name: '',
        type: 'tuple',
      },
      {
        components: [
          { internalType: 'uint256', name: 'poolId', type: 'uint256' },
          { internalType: 'uint256', name: 'stakedAmount', type: 'uint256' },
          {
            components: [
              {
                internalType: 'uint48',
                name: 'startTimestampHour',
                type: 'uint48',
              },
              {
                internalType: 'uint48',
                name: 'endTimestampHour',
                type: 'uint48',
              },
              {
                internalType: 'uint96',
                name: 'rewardsPerHour',
                type: 'uint96',
              },
              {
                internalType: 'uint96',
                name: 'capPerPosition',
                type: 'uint96',
              },
            ],
            internalType: 'struct ApeCoinStaking.TimeRange',
            name: 'currentTimeRange',
            type: 'tuple',
          },
        ],
        internalType: 'struct ApeCoinStaking.PoolUI',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
];

const provider = new JsonRpcProvider('https://rpc.ankr.com/eth', 1);
const stakingContract = new Contract(poolAddress, poolAbi, provider);
const contractFetcher = {
  getPoolsUI: stakingContract.getPoolsUI,
};

export const yieldTokens = {
  sApe: '0x7966c5bae631294d7cffcea5430b78c2f76db6fa',
};

/**
 * Staked ApeCoin APR fetching
 * @hidden
 *
 * @param contract - can be ignored, used for testing
 *
 * @returns apr in bsp
 */
export const tessera: AprFetcher = async (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _ = 1,
  contract = contractFetcher
) => {
  let apr = 0;

  try {
    const poolsUI = await contract.getPoolsUI();
    const apePool = poolsUI[0];
    const staked = apePool.stakedAmount;
    const reward = apePool.currentTimeRange.rewardsPerHour.mul(24 * 365);

    apr = Number(reward.mul(1e4).div(staked));
  } catch (error) {
    console.error('Failed to fetch Tessera Ape Coin APR:', error);
  }

  return {
    [yieldTokens.sApe]: apr,
  };
};
