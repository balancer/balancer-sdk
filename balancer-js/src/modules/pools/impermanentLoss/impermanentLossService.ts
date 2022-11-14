/**
 * Calculate the Impermanent Loss for a given pool and user.
 *
 * 1. Prepare the data:
 *  a. get exit price for pools' tokens
 *  b. get time and date when user joined first time
 *  c. get entry price for pools tokens when user joined first time
 * 2. calculate delta values for tokens in pools and if held
 * 3. calculate and return the impermanent loss as percentage rounded to 2 decimal places.
 *
 */
import { BalancerError, BalancerErrorCode } from '@/balancerErrors';
import { PoolJoinExitRepository } from '@/modules/data';
import { InvestType } from '@/modules/subgraph/generated/balancer-subgraph-types';
import { Findable, Pool, PoolToken, Price } from '@/types';

type Asset = {
  priceDelta: number;
  weight: number;
};

type TokenPrices = {
  [key:string]: number;
}

export class ImpermanentLossService {
  constructor(
    private tokenPrices: Findable<Price>,
    private poolJoinExits: PoolJoinExitRepository
  ) {}

  /**
   * entry point to calculate impermanent loss
   * @param userAddress the address of the user for which IL is requested
   * @param pool the pool
   * @returns the impermanent loss as percentage rounded to 2 decimal places
   */
  async calcImpLoss(userAddress: string, pool: Pool): Promise<number> {
    const assets = await this.prepareData(userAddress, pool);

    const poolValueDelta = this.getPoolValueDelta(assets);
    const holdValueDelta = this.getHoldValueDelta(assets);

    const impLoss = this.calculateImpermanentLoss(
      poolValueDelta,
      holdValueDelta
    );
    return Math.floor(impLoss * 100) / 100;
  }

  calculateImpermanentLoss(
    poolValueDelta: number,
    holdValueDelta: number
  ): number {
    return Math.abs(poolValueDelta / holdValueDelta - 1) * 100;
  }

  getPoolValueDelta(assets: Asset[]): number {
    return assets.reduce(
      (result, asset) =>
        result * Math.pow(Math.abs(asset.priceDelta + 1), asset.weight),
      1
    );
  }

  getHoldValueDelta(assets: Asset[]): number {
    return assets.reduce(
      (result, asset) => result + Math.abs(asset.priceDelta + 1) * asset.weight,
      0
    );
  }

  /**
   * prepare the data for calculating the impermanent loss
   *
   * @param userAddress the address of the user for which IL is requested
   * @param pool the pool
   * @returns a list of pair weight/price delta for each token in the pool
   * @throws BalancerError if
   *  1. a token's price is unknown
   *  2. a token's weight is unknown
   *  3. the user has no liquidity invested in the pool
   */
  async prepareData(userAddress: string, pool: Pool): Promise<Asset[]> {
    const entryTimestamp = await this.getEntryTimestamp(userAddress, pool.id);

    const poolTokens = pool.tokens.filter(
      (token) => token.address !== pool.address
    );

    const weights = this.getWeights(poolTokens);

    const tokenAddresses = poolTokens.map((t) => t.address);
    const entryPrices = await this.getEntryPrices(entryTimestamp, tokenAddresses);

    const exitPrices: TokenPrices = await this.getExitPrices(poolTokens);


    return poolTokens.map((token, i) => ({
      priceDelta: this.getDelta(entryPrices[token.address], exitPrices[token.address]),
      weight: weights[i],
    }));
  }

  getDelta(entryPrice: number, exitPrice: number) {
    return Math.floor(((exitPrice - entryPrice) / entryPrice) * 100) / 100;
  }

  /**
   * returns the list of token's weights.
   *
   * @param poolTokens the pools' tokens
   * @returns the list of token's weights
   * @throws BalancerError if a token's weight is missing
   *
   */
  getWeights(poolTokens: PoolToken[]): number[] {
    const noWeights =
      poolTokens.filter((token) => !token.weight).length === poolTokens.length;
    const uniformWeight = Math.round((1 / poolTokens.length) * 100) / 100;
    const weights: number[] = noWeights
      ? poolTokens.map(() => uniformWeight) // if no weight is returned we assume the tokens are balanced uniformly in the pool
      : poolTokens.map((token) => Number(token.weight ?? 0));

    if (weights.some((w) => w === 0)) {
      throw new BalancerError(BalancerErrorCode.MISSING_WEIGHT);
    }
    return weights;
  }

  /**
   * get the current's tokens' prices
   * @param tokens the pools' tokens
   * @returns a list of tokens with prices
   */
  async getExitPrices(tokens: PoolToken[]): Promise<TokenPrices> {
    const prices = await Promise.all(
      tokens.map((token) => this.tokenPrices.find(token.address))
    );

    const tokensWithPrice = tokens.map((token, i) => ({
      ...token,
      price: prices[i],
    }));
    if (tokensWithPrice.some((token) => token.price?.usd === undefined)) {
      throw new BalancerError(BalancerErrorCode.MISSING_PRICE_RATE);
    }
    const tokenPrices: TokenPrices = {};
    for (const token of tokensWithPrice) {
      if (token.price?.usd) tokenPrices[token.address] = +token.price.usd; // price.usd is never undefined but JS complains
    }
    return tokenPrices;
  }

  /**
   * get the timestamp of the first Join of the user, querying the JoinExits subgraph
   * @param userAddress the user's address
   * @param poolId the pool's id
   * @returns a Unix Timestamp
   */
  async getEntryTimestamp(
    userAddress: string,
    poolId: string
  ): Promise<number> {
    const joins = await this.poolJoinExits.query({
      where: { pool: poolId, sender: userAddress, type: InvestType.Join },
    });
    if (joins.length === 0) {
      throw new BalancerError(BalancerErrorCode.NO_POOL_DATA_FOR_USER);
    }
    return joins[0].timestamp;
  }

  /**
   * get the tokens' price at a given time
   *
   * @param timestamp the Unix timestamp
   * @param tokenAddresses the tokens' addresses
   * @returns a map of tokens' price
   */
  async getEntryPrices(
    timestamp: number,
    tokenAddresses: string[]
  ): Promise<TokenPrices> {
    const prices: TokenPrices = {};
    for (const address of tokenAddresses) {
      const price = await this.tokenPrices.findBy('timestamp', { address: address, timestamp: timestamp});
      if (!price?.usd) throw new BalancerError(BalancerErrorCode.NO_VALUE_PARAMETER);
      prices[address] = +price.usd;
    }
    return prices;
  }
}
