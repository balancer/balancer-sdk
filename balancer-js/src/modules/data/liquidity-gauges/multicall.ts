import { Multicall } from '@/contracts';
import { Interface } from '@ethersproject/abi';
import { formatUnits } from '@ethersproject/units';
import { BigNumber } from '@ethersproject/bignumber';
import type { Network } from '@/types';

const liquidityGaugeV5Interface = new Interface([
  'function totalSupply() view returns (uint)',
  'function working_supply() view returns (uint)',
  'function reward_count() view returns (uint)',
  'function reward_tokens(uint rewardIndex) view returns (address)',
  'function reward_data(address rewardToken) view returns (tuple(address token, address distributor, uint period_finish, uint rate, uint last_update, uint integral) data)',
]);

const childLiquidityGaugeInterface = new Interface([
  'function inflation_rate(uint currentWeekTimestamp) view returns (uint)',
]);

export interface RewardData {
  token: string; // Always 0x0
  distributor: string;
  period_finish: BigNumber;
  rate: BigNumber; // per second
  last_update: BigNumber;
  integral: BigNumber; // sum accrued to date
  decimals?: number; // Provided by subgraph
}

/**
 * A lot of code to get liquidity gauge state via RPC multicall.
 * TODO: reseach helper contracts or extend subgraph
 */
export class LiquidityGaugesMulticallRepository {
  constructor(private multicall: Multicall, private chainId: Network) {}

  async getTotalSupplies(
    gaugeAddresses: string[]
  ): Promise<{ [gaugeAddress: string]: number }> {
    const payload = gaugeAddresses.map((gaugeAddress) => ({
      target: gaugeAddress,
      callData: liquidityGaugeV5Interface.encodeFunctionData('totalSupply', []),
    }));
    const [, res] = await this.multicall.callStatic.aggregate(payload);
    // Handle 0x
    const res0x = res.map((r: string) => (r == '0x' ? '0x0' : r));

    const totalSupplies = gaugeAddresses.reduce(
      (p: { [key: string]: number }, a, i) => {
        p[a] ||= parseFloat(formatUnits(res0x[i], 18));
        return p;
      },
      {}
    );

    return totalSupplies;
  }

  async getWorkingSupplies(
    gaugeAddresses: string[]
  ): Promise<{ [gaugeAddress: string]: number }> {
    const payload = gaugeAddresses.map((gaugeAddress) => ({
      target: gaugeAddress,
      callData: liquidityGaugeV5Interface.encodeFunctionData(
        'working_supply',
        []
      ),
    }));
    const [, res] = await this.multicall.callStatic.aggregate(payload);
    // Handle 0x
    const res0x = res.map((r: string) => (r == '0x' ? '0x0' : r));

    const workingSupplies = gaugeAddresses.reduce(
      (p: { [key: string]: number }, a, i) => {
        p[a] ||= parseFloat(formatUnits(res0x[i], 18));
        return p;
      },
      {}
    );

    return workingSupplies;
  }

  async getInflationRates(
    gaugeAddresses: string[]
  ): Promise<{ [gaugeAddress: string]: number }> {
    const currentWeek = Math.floor(Date.now() / 1000 / 604800);
    const payload = gaugeAddresses.map((gaugeAddress) => ({
      target: gaugeAddress,
      callData: childLiquidityGaugeInterface.encodeFunctionData(
        'inflation_rate',
        [currentWeek]
      ),
    }));
    const [, res] = await this.multicall.callStatic.aggregate(payload);
    // Handle 0x
    const res0x = res.map((r: string) => (r == '0x' ? '0x0' : r));

    const inflationRates = gaugeAddresses.reduce(
      (p: { [key: string]: number }, a, i) => {
        p[a] ||= parseFloat(formatUnits(res0x[i], 18));
        return p;
      },
      {}
    );

    return inflationRates;
  }

  async getRewardCounts(
    gaugeAddresses: string[]
  ): Promise<{ [gaugeAddress: string]: number }> {
    let rewardCounts;
    if (this.chainId == 1) {
      const payload = gaugeAddresses.map((gaugeAddress) => ({
        target: gaugeAddress,
        callData: liquidityGaugeV5Interface.encodeFunctionData(
          'reward_count',
          []
        ),
      }));
      const [, res] = await this.multicall.callStatic.aggregate(payload);
      // Handle 0x return values
      const res0x = res.map((r: string) => (r == '0x' ? '0x0' : r));

      rewardCounts = gaugeAddresses.reduce(
        (p: { [key: string]: number }, a, i) => {
          p[a] ||= parseInt(res0x[i]);
          return p;
        },
        {}
      );
    } else {
      rewardCounts = gaugeAddresses.reduce(
        (p: { [key: string]: number }, a) => {
          p[a] ||= 1;
          return p;
        },
        {}
      );
    }

    return rewardCounts;
  }

  async getRewardTokens(
    gaugeAddresses: string[],
    passingRewardCounts?: { [gaugeAddress: string]: number }
  ): Promise<{ [gaugeAddress: string]: string[] }> {
    const rewardCounts =
      passingRewardCounts || (await this.getRewardCounts(gaugeAddresses));
    const gaugesWithRewards = gaugeAddresses.filter(
      (gaugeAddress) => rewardCounts[gaugeAddress] > 0
    );
    const startIndexes = [0];
    const payload = gaugesWithRewards
      .map((gaugeAddress, gaugeIndex) => {
        const calls = [];
        for (let i = 0; i < rewardCounts[gaugeAddress]; i++) {
          calls.push({
            target: gaugeAddress,
            callData: liquidityGaugeV5Interface.encodeFunctionData(
              'reward_tokens',
              [i]
            ),
          });
        }
        startIndexes[gaugeIndex + 1] =
          startIndexes[gaugeIndex] + rewardCounts[gaugeAddress];
        return calls;
      })
      .flat();
    const [, res] = await this.multicall.callStatic.aggregate(payload);

    const rewardTokens = gaugesWithRewards.reduce(
      (p: { [key: string]: string[] }, a, i) => {
        const start = startIndexes[i];
        const end = startIndexes[i + 1];
        const tokens: string[] = [];
        for (let i = start; i < end; i++) {
          tokens.push(
            liquidityGaugeV5Interface.decodeFunctionResult(
              'reward_tokens',
              res[i]
            )[0]
          );
        }
        p[a] ||= tokens;
        return p;
      },
      {}
    );

    return rewardTokens;
  }

  async getRewardData(
    gaugeAddresses: string[],
    passingRewardTokens?: { [gaugeAddress: string]: string[] }
  ): Promise<{
    [gaugeAddress: string]: { [rewardTokenAddress: string]: RewardData };
  }> {
    const rewardTokens =
      passingRewardTokens || (await this.getRewardTokens(gaugeAddresses));

    const startIndexes = [0];
    const payload = Object.keys(rewardTokens)
      .map((gaugeAddress, gaugeIndex) => {
        const calls = [];
        for (let i = 0; i < rewardTokens[gaugeAddress].length; i++) {
          calls.push({
            target: gaugeAddress,
            callData: liquidityGaugeV5Interface.encodeFunctionData(
              'reward_data',
              [rewardTokens[gaugeAddress][i]]
            ),
          });
        }
        startIndexes[gaugeIndex + 1] =
          startIndexes[gaugeIndex] + rewardTokens[gaugeAddress].length;
        return calls;
      })
      .flat();
    const [, res] = (await this.multicall.callStatic.aggregate(payload)) as [
      unknown,
      string[]
    ];
    const decoded = res.map(
      (r) => liquidityGaugeV5Interface.decodeFunctionResult('reward_data', r)[0]
    );

    const rewardData = Object.keys(rewardTokens).reduce(
      (p: { [key: string]: { [key: string]: RewardData } }, a, i) => {
        const start = startIndexes[i];
        const data = rewardTokens[a].reduce(
          (d: { [key: string]: RewardData }, t, x) => {
            d[t] ||= decoded[start + x] as RewardData;
            return d;
          },
          {}
        );
        p[a] ||= data;
        return p;
      },
      {}
    );

    return rewardData;
  }
}
