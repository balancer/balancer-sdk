/**
 * Calculate the Impermanent Loss for a given pool and user.
 *
 * 1. Prepare the data:
 *  a. get exit price for pools' tokens
 *  b. get entry price for pools' tokens
 * 2. calculate delta values for tokens in pools
 * 3. calculate and return the impermanent loss as percentage rounded to 2 decimal places.
 *
 */
import { BalancerError, BalancerErrorCode } from '@/balancerErrors';
import { Findable, Pool, PoolToken, Price } from '@/types';
import { Logger } from '@/lib/utils/logger';

type Asset = {
  priceDelta: number;
  weight: number;
};

type TokenPrices = {
  [key: string]: number;
};

export class ImpermanentLossService {
  constructor(
    private tokenPrices: Findable<Price>,
    private tokenHistoricalPrices: Findable<Price>
  ) {}

  /**
   * entry point to calculate impermanent loss.
   *
   * The function will
   *  - retrieve the tokens' historical value at the desired time in the future
   *  - calculate the relative variation between current and historical value
   *  - return the IL in percentage rounded to 2 decimal places
   *
   * @param timestamp UNIX timestamp from which the IL is desired
   * @param pool the pool
   * @returns the impermanent loss as percentage rounded to 2 decimal places
   */
  async calcImpLoss(timestamp: number, pool: Pool): Promise<number> {
    if (timestamp * 1000 >= Date.now()) {
      console.error(
        `[ImpermanentLossService][calcImpLoss]Error: ${BalancerError.getMessage(
          BalancerErrorCode.TIMESTAMP_IN_THE_FUTURE
        )}`
      );
      throw new BalancerError(BalancerErrorCode.TIMESTAMP_IN_THE_FUTURE);
    }
    const assets = await this.prepareData(timestamp, pool);

    const poolValueDelta = this.getPoolValueDelta(assets);
    const holdValueDelta = this.getHoldValueDelta(assets);

    const impLoss = this.calculateImpermanentLoss(
      poolValueDelta,
      holdValueDelta
    );
    return impLoss;
  }

  calculateImpermanentLoss(
    poolValueDelta: number,
    holdValueDelta: number
  ): number {
    return (
      Math.floor(Math.abs(poolValueDelta / holdValueDelta - 1) * 100 * 100) /
      100
    );
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
   * @param entryTimestamp UNIX timestamp from which the IL is desired
   * @param pool the pool
   * @returns a list of pair weight/price delta for each token in the pool
   * @throws BalancerError if
   *  1. a token's price is unknown
   *  2. a token's weight is unknown
   *  3. the user has no liquidity invested in the pool
   */
  async prepareData(entryTimestamp: number, pool: Pool): Promise<Asset[]> {
    const poolTokens = pool.tokens.filter(
      (token) => token.address !== pool.address
    );

    const weights = this.getWeights(poolTokens);

    const tokenAddresses = poolTokens.map((t) => t.address);

    const entryPrices = await this.getEntryPrices(
      entryTimestamp,
      tokenAddresses
    );
    const exitPrices: TokenPrices = await this.getExitPrices(poolTokens);

    return this.getAssets(poolTokens, exitPrices, entryPrices, weights);
  }

  getAssets(
    poolTokens: PoolToken[],
    exitPrices: TokenPrices,
    entryPrices: TokenPrices,
    weights: number[]
  ): Asset[] {
    return poolTokens.map((token, i) => ({
      priceDelta: this.getDelta(
        entryPrices[token.address],
        exitPrices[token.address]
      ),
      weight: weights[i],
    }));
  }

  getDelta(entryPrice: number, exitPrice: number): number {
    if (entryPrice === 0) {
      console.error(
        `[ImpermanentLossService][getDelta]Error: ${BalancerError.getMessage(
          BalancerErrorCode.ILLEGAL_PARAMETER
        )}: entry price is 0`
      );
      throw new BalancerError(BalancerErrorCode.ILLEGAL_PARAMETER);
    }
    return (exitPrice - entryPrice) / entryPrice;
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
    const noWeights = poolTokens.every((token) => !token.weight);
    const uniformWeight = Math.round((1 / poolTokens.length) * 100) / 100;
    const weights: number[] = noWeights
      ? poolTokens.map(() => uniformWeight) // if no weight is returned we assume the tokens are balanced uniformly in the pool
      : poolTokens.map((token) => Number(token.weight ?? 0));

    if (weights.some((w) => w === 0)) {
      console.error(
        `[ImpermanentLossService][getWeights]Error: ${BalancerError.getMessage(
          BalancerErrorCode.MISSING_WEIGHT
        )}`
      );
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
    ).catch(() => []);

    if (!prices.length || prices.some((price) => price?.usd === undefined)) {
      console.error(
        `[ImpermanentLossService][getExitPrices]Error: ${BalancerError.getMessage(
          BalancerErrorCode.MISSING_PRICE_RATE
        )}`
      );
      throw new BalancerError(BalancerErrorCode.MISSING_PRICE_RATE);
    }

    const tokensWithPrice = tokens.map((token, i) => ({
      ...token,
      price: prices[i],
    }));

    const tokenPrices: TokenPrices = {};
    for (const token of tokensWithPrice) {
      if (token.price?.usd) tokenPrices[token.address] = +token.price.usd; // price.usd is never undefined but JS complains
    }
    return tokenPrices;
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
      const price = await this.tokenHistoricalPrices
        .findBy(address, timestamp)
        .catch((reason) => {
          const logger = Logger.getInstance();
          logger.warn(
            `[ImpermanentLossService][getEntryPrices]Error: ${reason.message}`
          );
          return undefined;
        });
      if (!price?.usd) {
        const logger = Logger.getInstance();
        logger.warn(
          `[ImpermanentLossService][getEntryPrices]Error: ${BalancerError.getMessage(
            BalancerErrorCode.MISSING_PRICE_RATE
          )}`
        );
        throw new BalancerError(BalancerErrorCode.MISSING_PRICE_RATE);
      }
      prices[address] = +price.usd;
    }
    return prices;
  }
}
