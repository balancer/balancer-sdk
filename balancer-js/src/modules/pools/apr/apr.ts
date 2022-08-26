import { formatUnits } from '@ethersproject/units';
import * as emissions from '@/modules/data/bal/emissions';
import type {
  Findable,
  Pool,
  PoolAttribute,
  Price,
  Token,
  TokenAttribute,
  LiquidityGauge,
} from '@/types';
import { BaseFeeDistributor } from '@/modules/data';
import { ProtocolRevenue } from './protocol-revenue';
import { Liquidity } from '@/modules/liquidity/liquidity.module';

export interface AprBreakdown {
  swapFees: number;
  tokenAprs: number;
  stakingApr: {
    min: number;
    max: number;
  };
  rewardAprs: {
    total: number;
    breakdown: { [address: string]: number };
  };
  protocolApr: number;
  min: number;
  max: number;
}

/**
 * Calculates pool APR via summing up sources of APR:
 *
 * 1. Swap fees (pool level) data coming from subgraph
 * 2. Yield bearing pool tokens, with data from external sources eg: http endpoints, subgraph, onchain
 *    * stETH
 *    * aave
 *    * usd+
 *    map token: calculatorFn
 * 3. Staking rewards based from veBal gauges
 */
export class PoolApr {
  constructor(
    private pool: Pool,
    private tokenPrices: Findable<Price>,
    private tokenMeta: Findable<Token, TokenAttribute>,
    private pools: Findable<Pool, PoolAttribute>,
    private yesterdaysPools: Findable<Pool, PoolAttribute>,
    private liquidityGauges: Findable<LiquidityGauge>,
    private feeDistributor: BaseFeeDistributor,
    private feeCollector: Findable<number>,
    private tokenYields: Findable<number>
  ) {}

  /**
   * Pool revenue via swap fees.
   * Fees and liquidity are takes from subgraph as USD floats.
   *
   * @returns APR [bsp] from fees accumulated over last 24h
   */
  async swapFees(): Promise<number> {
    // 365 * dailyFees * (1 - protocolFees) / totalLiquidity
    const last24hFees = await this.last24hFees();
    const totalLiquidity = await this.totalLiquidity(this.pool);
    // TODO: what to do when we are missing last24hFees or totalLiquidity?
    if (!last24hFees || !totalLiquidity) {
      return 0;
    }
    const dailyFees =
      last24hFees * (1 - (await this.protocolSwapFeePercentage()));
    const feesDailyBsp = 10000 * (dailyFees / parseFloat(totalLiquidity));

    return Math.round(365 * feesDailyBsp);
  }

  /**
   * Pool revenue from holding yield-bearing wrapped tokens.
   *
   * @returns APR [bsp] from tokens contained in the pool
   */
  async tokenAprs(): Promise<number> {
    if (!this.pool.tokens) {
      return 0;
    }

    const totalLiquidity = await this.totalLiquidity(this.pool);

    // Filter out BPT: token with the same address as the pool
    // TODO: move this to data layer
    const bptFreeTokens = this.pool.tokens.filter((token) => {
      return token.address !== this.pool.address;
    });

    // Get each token APRs
    const aprs = bptFreeTokens.map(async (token) => {
      let apr = 0;
      const tokenYield = await this.tokenYields.find(token.address);

      if (tokenYield) {
        apr = tokenYield;
      } else {
        // Handle subpool APRs with recursive call to get the subPool APR
        const subPool = await this.pools.findBy('address', token.address);

        if (subPool) {
          // INFO: Liquidity mining APR can't cascade to other pools
          const subApr = new PoolApr(
            subPool,
            this.tokenPrices,
            this.tokenMeta,
            this.pools,
            this.yesterdaysPools,
            this.liquidityGauges,
            this.feeDistributor,
            this.feeCollector,
            this.tokenYields
          );
          const subSwapFees = await subApr.swapFees();
          const subtokenAprs = await subApr.tokenAprs();
          apr = subSwapFees + subtokenAprs;
        }
      }

      return apr;
    });

    // Get token weights normalised by usd price
    const weights = bptFreeTokens.map(async (token): Promise<number> => {
      if (token.weight) {
        return parseFloat(token.weight);
      } else {
        let tokenPrice =
          token.price?.usd || (await this.tokenPrices.find(token.address))?.usd;
        if (!tokenPrice) {
          const poolToken = await this.pools.findBy('address', token.address);
          if (poolToken) {
            tokenPrice = (await this.bptPrice(poolToken)).toString();
          } else {
            throw `No price for ${token.address}`;
          }
        }
        // using floats assuming frontend purposes with low precision needs
        const tokenValue = parseFloat(token.balance) * parseFloat(tokenPrice);
        return tokenValue / parseFloat(totalLiquidity);
      }
    });

    // Normalise tokenAPRs according to weights
    const weightedAprs = await Promise.all(
      aprs.map(async (apr, idx) => {
        const [a, w] = await Promise.all([apr, weights[idx]]);
        return Math.round(a * w);
      })
    );

    // sum them up to get pool APRs
    const apr = weightedAprs.reduce((sum, apr) => sum + apr, 0);

    return apr;
  }

  /**
   * Calculates staking rewards based on veBal gauges deployed with Curve Finance contracts.
   * https://curve.readthedocs.io/dao-gauges.html
   *
   * Terminology:
   *  - LP token of a gauge is a BPT of a pool
   *  - Depositing into a gauge is called staking on the frontend
   *  - gauge totalSupply - BPT tokens deposited to a gauge
   *  - gauge workingSupply - effective BPT tokens participating in reward distribution. sum of 40% deposit + 60% boost from individual user's veBal
   *  - gauge relative weight - weight of this gauge in bal inflation distribution [0..1] scaled to 1e18
   *
   * APR sources:
   *  - gauge BAL emissions = min: 40% of totalSupply, max: 40% of totalSupply + 60% of totalSupply * gauge LPs voting power
   *    https://github.com/balancer-labs/balancer-v2-monorepo/blob/master/pkg/liquidity-mining/contracts/gauges/ethereum/LiquidityGaugeV5.vy#L338
   *  - gauge reward tokens: Admin or designated depositor has an option to deposit additional reward with a weekly accruing cadence.
   *    https://github.com/balancer-labs/balancer-v2-monorepo/blob/master/pkg/liquidity-mining/contracts/gauges/ethereum/LiquidityGaugeV5.vy#L641
   *    rate: amount of token per second
   *
   * @returns APR [bsp] from protocol rewards.
   */
  async stakingApr(boost = 1): Promise<number> {
    // Data resolving
    const gauge = await this.liquidityGauges.findBy('poolId', this.pool.id);
    if (!gauge) {
      return 0;
    }

    const [balPrice, bptPriceUsd] = await Promise.all([
      this.tokenPrices.find('0xba100000625a3754423978a60c9317c58a424e3d'),
      this.bptPrice(this.pool),
    ]);
    const balPriceUsd = parseFloat(balPrice?.usd || '0');

    const now = Math.round(new Date().getTime() / 1000);
    const totalBalEmissions = emissions.between(now, now + 365 * 86400);
    const gaugeBalEmissions = totalBalEmissions * gauge.relativeWeight;
    const gaugeBalEmissionsUsd = gaugeBalEmissions * balPriceUsd;
    const gaugeSupply = (gauge.workingSupply + 0.4) / 0.4; // Only 40% of LP token staked accrue emissions, totalSupply = workingSupply * 2.5
    const gaugeSupplyUsd = gaugeSupply * bptPriceUsd;
    const gaugeBalAprBps = Math.round(
      (boost * 10000 * gaugeBalEmissionsUsd) / gaugeSupplyUsd
    );

    return gaugeBalAprBps;
  }

  /**
   * Some gauges are holding tokens distributed as rewards to LPs.
   *
   * @returns APR [bsp] from token rewards.
   */
  async rewardAprs(): Promise<AprBreakdown['rewardAprs']> {
    // Data resolving
    const gauge = await this.liquidityGauges.findBy('poolId', this.pool.id);
    if (
      !gauge ||
      !gauge.rewardTokens ||
      Object.keys(gauge.rewardTokens).length < 1
    ) {
      return { total: 0, breakdown: {} };
    }

    const rewardTokenAddresses = Object.keys(gauge.rewardTokens);

    // Gets each tokens rate, extrapolate to a year and convert to USD
    const rewards = rewardTokenAddresses.map(async (tAddress) => {
      /* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */
      const data = gauge!.rewardTokens![tAddress];
      if (data.period_finish.toNumber() < Date.now() / 1000) {
        return {
          address: tAddress,
          value: 0,
        };
      } else {
        const yearlyReward = data.rate.mul(86400).mul(365);
        const price = await this.tokenPrices.find(tAddress);
        if (price && price.usd) {
          const meta = await this.tokenMeta.find(tAddress);
          const decimals = meta?.decimals || 18;
          const yearlyRewardUsd =
            parseFloat(formatUnits(yearlyReward, decimals)) *
            parseFloat(price.usd);
          return {
            address: tAddress,
            value: yearlyRewardUsd,
          };
        } else {
          throw `No USD price for ${tAddress}`;
        }
      }
    });

    // Get the gauge totalSupplyUsd
    const bptPriceUsd = await this.bptPrice(this.pool);
    const totalSupplyUsd = gauge.totalSupply * bptPriceUsd;

    if (totalSupplyUsd == 0) {
      return { total: 0, breakdown: {} };
    }

    const rewardTokensBreakdown: Record<string, number> = {};

    let total = 0;
    for await (const reward of Object.values(rewards)) {
      const rewardValue = reward.value / totalSupplyUsd;
      total += rewardValue;
      rewardTokensBreakdown[reward.address] = reward.value;
    }

    return {
      total: Math.round(10000 * total),
      breakdown: rewardTokensBreakdown,
    };
  }

  /**
   * 80BAL-20WETH pool is accruing protocol revenue.
   */
  async protocolApr(): Promise<number> {
    const veBalPoolId =
      '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014';

    if (this.pool.id != veBalPoolId) {
      return 0;
    }

    const revenue = new ProtocolRevenue(this.feeDistributor, this.tokenPrices);

    const { lastWeekBalRevenue, lastWeekBBAUsdRevenue, veBalSupply } =
      await revenue.data();

    const bptPrice = await this.bptPrice(this.pool);
    if (!bptPrice) {
      throw 'bptPrice for veBal pool missing';
    }

    const dailyRevenue = (lastWeekBalRevenue + lastWeekBBAUsdRevenue) / 7;
    const apr = Math.round(
      (10000 * (365 * dailyRevenue)) / (bptPrice * veBalSupply)
    );

    return apr;
  }

  /**
   * Composes all sources for total pool APR.
   *
   * @returns pool APR split [bsp]
   */
  async apr(): Promise<AprBreakdown> {
    const [
      swapFees,
      tokenAprs,
      minStakingApr,
      maxStakingApr,
      rewardAprs,
      protocolApr,
    ] = await Promise.all([
      this.swapFees(), // pool snapshot for last 24h fees dependency
      this.tokenAprs(),
      this.stakingApr(),
      this.stakingApr(2.5),
      this.rewardAprs(),
      this.protocolApr(),
    ]);

    return {
      swapFees,
      tokenAprs,
      stakingApr: {
        min: minStakingApr,
        max: maxStakingApr,
      },
      rewardAprs,
      protocolApr,
      min:
        swapFees + tokenAprs + rewardAprs.total + protocolApr + minStakingApr,
      max:
        swapFees + tokenAprs + rewardAprs.total + protocolApr + maxStakingApr,
    };
  }

  // 🚨 this is adding 1 call to get yesterday's block height and 2nd call to fetch yesterday's pools data from subgraph
  // TODO: find a better data source for that eg. add blocks to graph, replace with a database, or dune
  private async last24hFees(): Promise<number> {
    const yesterdaysPool = await this.yesterdaysPools.find(this.pool.id);
    if (
      !this.pool.totalSwapFee ||
      !yesterdaysPool ||
      !yesterdaysPool.totalSwapFee
    ) {
      return 0;
    }

    return (
      parseFloat(this.pool.totalSwapFee) -
      parseFloat(yesterdaysPool.totalSwapFee)
    );
  }

  private async totalLiquidity(pool: Pool): Promise<string> {
    const liquidityService = new Liquidity(this.pools, this.tokenPrices);
    const liquidity = await liquidityService.getLiquidity(pool);

    return liquidity;
  }

  private async bptPrice(pool: Pool) {
    return (
      parseFloat(await this.totalLiquidity(pool)) / parseFloat(pool.totalShares)
    );
  }

  private async protocolSwapFeePercentage() {
    const fee = await this.feeCollector.find('');

    return fee ? fee : 0;
  }
}
