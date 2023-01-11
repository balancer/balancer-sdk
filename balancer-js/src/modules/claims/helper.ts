import {LiquidityGauge} from "@/modules/data";

export interface Tokens { [tokenAddress: string]: number }

export interface GaugeTokens { [gaugeAddress: string]: Tokens }

export interface ReduceGaugeTokens {
  (p: GaugeTokens , address: string, index: number): GaugeTokens
}

export interface ReduceGaugeRewards {
  (rewards: GaugeTokens, path:{ gauge: string, token: string }, index: number): GaugeTokens
}

export const filterTokens = (tokens: Tokens): Tokens => {
  if (!tokens) return {};
  return Object.keys(tokens)
    .filter((token) => tokens[token] > 0)
    .reduce((obj: Tokens, token) => {
      obj[token] = tokens[token]
      return obj;
    }, {});
}

export const populateGauge = (gauge: LiquidityGauge, rewards: GaugeTokens, tokens: GaugeTokens): LiquidityGauge => {
  if (!rewards[gauge.address] && !tokens[gauge.address]) return gauge;
  const claimableRewards = filterTokens(rewards[gauge.address]);
  const claimableTokens = filterTokens(tokens[gauge.address]);
  gauge.claimableTokens ||= {
    ...claimableRewards,
    ...claimableTokens
  };
  return gauge;
}

export const populateGauges = (gauges: LiquidityGauge[], claimableRewards: GaugeTokens, claimableTokens: GaugeTokens): LiquidityGauge[] => {
   return gauges
    .map((gauge) => populateGauge(gauge, claimableRewards, claimableTokens))
    .filter((it) => it.claimableTokens && Object.keys(it.claimableTokens).length);
}

export const reduceClaimableRewards = (res0x: string[]): ReduceGaugeRewards => {
  return (rewards: GaugeTokens, path:{ gauge: string, token: string }, index: number): GaugeTokens => {
    const value = parseInt(res0x[index]);
    if (value > 0) {
      rewards[path.gauge] ||= {};
      rewards[path.gauge][path.token] = value;
    }
    return rewards;
  }
}

export const reduceClaimableTokens = (res0x: string[], balAddress: string): ReduceGaugeTokens => {
  return (p: GaugeTokens , address: string, index: number): GaugeTokens => {
    const value = parseInt(res0x[index]);
    if (value > 0) {
      p[address] ||= {};
      p[address][balAddress] = value
    }
    return p;
  }
}

export const reduceRewardTokens = (result: { [gaugeAddress: string]: string[] }, gauge: LiquidityGauge) => {
  if (gauge.rewardTokens) {
    for (const key of Object.keys(gauge.rewardTokens)) {
      result[gauge.id] ||= [];
      result[gauge.id].push(key);
    }
  }
  return result;
}