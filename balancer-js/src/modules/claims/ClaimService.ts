import { BalancerError, BalancerErrorCode } from '@/balancerErrors';
import { Network } from '@/lib/constants';
import { BALANCER_NETWORK_CONFIG } from '@/lib/constants/config';
import { Multicall } from '@/contracts';
import {
  FeeDistributorRepository,
  LiquidityGauge,
  LiquidityGaugeSubgraphRPCProvider,
} from '@/modules/data';
import { Interface } from '@ethersproject/abi';
import { BigNumber } from '@ethersproject/bignumber';
import {
  GaugeTokens,
  populateGauges,
  reduceClaimableRewards,
  reduceClaimableTokens,
  reduceRewardTokens,
  ZERO,
} from './helper';

const liquidityGaugeV5Interface = new Interface([
  'function claim_rewards(address sender, address receiver) returns (uint256)',
  'function claimable_tokens(address addr) view returns (uint256)',
  'function claimable_reward(address addr, address token) view returns (uint256)',
]);

const balancerMinterInterface = new Interface([
  'function mintMany(address[] gauges) returns (uint256)',
]);

const gaugeClaimHelperInterface = new Interface([
  'function getPendingRewards(address gauge, address user, address token) view returns (uint256)',
  'function claimRewardsFromGauges(address[] gauges, address user)',
]);

export interface TransactionData {
  to: string;
  from: string;
  callData: string;
  tokensOut: string[];
  expectedTokensValue: BigNumber[];
  functionName: string;
}

export interface TokenBalance {
  [token: string]: BigNumber;
}

export interface IClaimService {
  getClaimableRewardTokens(userAddress: string): Promise<LiquidityGauge[]>;
  buildClaimRewardTokensRequest(
    gaugeAddresses: string[],
    userAddress: string
  ): Promise<TransactionData>;
  getClaimableVeBalTokens(
    userAddress: string,
    claimableTokens: string[]
  ): Promise<TokenBalance>;
  buildClaimVeBalTokensRequest(
    userAddress: string,
    claimableTokens: string[]
  ): Promise<TransactionData>;
}

export class ClaimService implements IClaimService {
  private readonly liquidityGauges: LiquidityGaugeSubgraphRPCProvider;
  private readonly gaugeClaimHelperAddress?: string;
  private readonly balancerMinterAddress?: string;
  private readonly chainId: Network;
  private readonly feeDistributor: FeeDistributorRepository | undefined;

  constructor(
    liquidityGauges: LiquidityGaugeSubgraphRPCProvider,
    feeDistributor: FeeDistributorRepository | undefined,
    chainId: Network,
    private multicall: Multicall,
    gaugeClaimHelperAddress?: string,
    balancerMinterAddress?: string
  ) {
    this.liquidityGauges = liquidityGauges;
    this.feeDistributor = feeDistributor;
    this.chainId = chainId;
    this.gaugeClaimHelperAddress = gaugeClaimHelperAddress;
    this.balancerMinterAddress = balancerMinterAddress;
  }

  /**
   * Get a list of liquidity gauges populated with the claimable tokens for the user.
   *
   * @param userAddress the user's account address
   */
  async getClaimableRewardTokens(
    userAddress: string
  ): Promise<LiquidityGauge[]> {
    const gauges = await this.getGauges();
    if (!gauges.length)
      throw new BalancerError(BalancerErrorCode.GAUGES_NOT_FOUND);

    const gaugeAddresses = gauges.map((it) => it.address);
    const rewardTokens = this.getRewardTokens(gauges);

    const claimableTokens = await this.retrieveClaimableTokens(
      gaugeAddresses,
      userAddress
    );
    const claimableRewards = await this.retrieveClaimableRewards(
      rewardTokens,
      userAddress
    );
    return populateGauges(gauges, claimableRewards, claimableTokens);
  }

  /**
   * Returns the data to be signed to claim the tokens on a list of liquidity gauges.
   * Only the tokens with balance will be claimed.
   *
   * @param gaugeAddresses the liquidity gauges' addresses
   * @param userAddress the user's account address
   * @throws error if no claimable token is found
   */
  async buildClaimRewardTokensRequest(
    gaugeAddresses: string[],
    userAddress: string
  ): Promise<TransactionData> {
    if (this.chainId === 1 || this.chainId === 5) {
      if (!this.balancerMinterAddress)
        throw new BalancerError(
          BalancerErrorCode.GAUGES_REWARD_MINTER_ADDRESS_NOT_PROVIDED
        );
    } else {
      if (!this.gaugeClaimHelperAddress)
        throw new BalancerError(
          BalancerErrorCode.GAUGES_HELPER_ADDRESS_NOT_PROVIDED
        );
    }
    const allGauges = await this.getClaimableRewardTokens(userAddress);
    const gauges = allGauges
      .filter((it) =>
        gaugeAddresses
          .map((it) => it.toLowerCase())
          .includes(it.address.toLowerCase())
      )
      .filter(
        (it) => it.claimableTokens && Object.keys(it.claimableTokens).length
      );
    const claimableTokens = Array.from(
      new Set(
        gauges
          .map((gauge) => gauge.claimableTokens)
          .map((tokens) => Object.keys(tokens || {}))
          .flatMap((it) => it)
      )
    );
    if (!claimableTokens.length)
      throw new BalancerError(BalancerErrorCode.GAUGES_REWARD_TOKEN_EMPTY);
    const expectedValues = claimableTokens.map((tokenAddress) => {
      return gauges.reduce((value: BigNumber, gauge) => {
        if (
          gauge.claimableTokens &&
          gauge.claimableTokens[tokenAddress] &&
          gauge.claimableTokens[tokenAddress] !== ZERO
        )
          value = gauge.claimableTokens[tokenAddress].add(value);
        return value;
      }, BigNumber.from(0));
    });
    if (!expectedValues.length || expectedValues.every((it) => it.eq(ZERO)))
      throw new BalancerError(BalancerErrorCode.REWARD_TOKEN_ZERO);
    if (this.chainId === 1 || this.chainId === 5) {
      if (!this.balancerMinterAddress)
        throw new BalancerError(
          BalancerErrorCode.GAUGES_REWARD_MINTER_ADDRESS_NOT_PROVIDED
        );
      const callData = balancerMinterInterface.encodeFunctionData('mintMany', [
        gaugeAddresses,
      ]);
      return {
        to: this.balancerMinterAddress,
        from: userAddress,
        callData: callData,
        tokensOut: claimableTokens,
        expectedTokensValue: expectedValues,
        functionName: 'mintMany',
      };
    } else {
      if (!this.gaugeClaimHelperAddress)
        throw new BalancerError(
          BalancerErrorCode.GAUGES_HELPER_ADDRESS_NOT_PROVIDED
        );
      const callData = gaugeClaimHelperInterface.encodeFunctionData(
        'claimRewardsFromGauges',
        [gaugeAddresses, userAddress]
      );
      return {
        to: this.gaugeClaimHelperAddress,
        from: userAddress,
        callData: callData,
        tokensOut: claimableTokens,
        expectedTokensValue: expectedValues,
        functionName: 'claimRewardsFromGauges',
      };
    }
  }

  /**
   * returns all the tokens' balance for protocol revenue and veBal incentives.
   *
   * @param userAddress the user's account address
   * @param claimableTokens the list of tokens for which the balance is desired
   */
  async getClaimableVeBalTokens(
    userAddress: string,
    claimableTokens: string[]
  ): Promise<TokenBalance> {
    if (!this.feeDistributor)
      throw new BalancerError(BalancerErrorCode.FEE_PROVIDER_NOT_PROVIDED);
    return this.feeDistributor?.getClaimableBalances(
      userAddress,
      claimableTokens
    );
  }

  /**
   * Returns the data to be signed to claim the tokens for protocol revenue and veBal incentives.
   *
   * @param userAddress the user's account address
   * @param claimableTokens the list of tokens to be claimed
   * @throws error if no claimable token is found
   */
  async buildClaimVeBalTokensRequest(
    userAddress: string,
    claimableTokens: string[]
  ): Promise<TransactionData> {
    if (!this.feeDistributor)
      throw new BalancerError(BalancerErrorCode.FEE_PROVIDER_NOT_PROVIDED);
    const tokenBalance = await this.feeDistributor.getClaimableBalances(
      userAddress,
      claimableTokens
    );
    const expectedTokensValue = claimableTokens.map(
      (it) => tokenBalance[it] ?? ZERO
    );
    if (expectedTokensValue.every((it) => it.eq(ZERO)))
      throw new BalancerError(BalancerErrorCode.REWARD_TOKEN_ZERO);
    const callData = this.feeDistributor.claimBalances(
      userAddress,
      claimableTokens
    );
    return {
      to: this.feeDistributor.feeDistributor.address,
      from: userAddress,
      callData: callData,
      tokensOut: claimableTokens,
      expectedTokensValue: expectedTokensValue,
      functionName: 'claimTokens',
    };
  }

  // Private Functions

  private async getGauges(): Promise<LiquidityGauge[]> {
    return await this.liquidityGauges.fetch();
  }

  private getRewardTokens(gauges: LiquidityGauge[]): {
    [gaugeAddress: string]: string[];
  } {
    return gauges.reduce(reduceRewardTokens, {});
  }

  private async retrieveClaimableRewards(
    rewardTokens: { [address: string]: string[] },
    userAddress: string
  ): Promise<GaugeTokens> {
    const gaugeAddresses = Object.keys(rewardTokens);
    const { payload, paths } = this.getPayload(
      gaugeAddresses,
      rewardTokens,
      userAddress
    );
    const [, res] = await this.multicall.callStatic.aggregate(payload);
    const res0x = res.map((r: string) => (r == '0x' ? '0x0' : r));
    return paths.reduce(reduceClaimableRewards(res0x), {});
  }

  private getPayload(
    gaugeAddresses: string[],
    rewardTokens: { [address: string]: string[] },
    userAddress: string
  ): {
    payload: { target: string; callData: string }[];
    paths: { gauge: string; token: string }[];
  } {
    const payload = [];
    const paths: { gauge: string; token: string }[] = [];
    for (const gaugeAddress of gaugeAddresses) {
      for (const tokenAddress of rewardTokens[gaugeAddress]) {
        paths.push({ gauge: gaugeAddress, token: tokenAddress });
        payload.push(
          this.getArguments(userAddress, gaugeAddress, tokenAddress)
        );
      }
    }
    return { payload, paths };
  }

  private getArguments(
    userAddress: string,
    gaugeAddress: string,
    tokenAddress: string
  ): { target: string; callData: string } {
    if (this.chainId === 1 || this.chainId === 5) {
      return {
        target: gaugeAddress,
        callData: liquidityGaugeV5Interface.encodeFunctionData(
          'claimable_reward',
          [userAddress, tokenAddress]
        ),
      };
    }
    if (!this.gaugeClaimHelperAddress)
      throw new BalancerError(
        BalancerErrorCode.GAUGES_HELPER_ADDRESS_NOT_PROVIDED
      );
    return {
      target: this.gaugeClaimHelperAddress,
      callData: gaugeClaimHelperInterface.encodeFunctionData(
        'getPendingRewards',
        [gaugeAddress, userAddress, tokenAddress]
      ),
    };
  }

  private async retrieveClaimableTokens(
    gaugeAddresses: string[],
    userAddress: string
  ): Promise<GaugeTokens> {
    if (this.chainId === Network.MAINNET || this.chainId === Network.GOERLI) {
      const balAddress = BALANCER_NETWORK_CONFIG[this.chainId].addresses.tokens
        .bal as string;
      const payload = gaugeAddresses.map((gaugeAddress) => ({
        target: gaugeAddress,
        callData: liquidityGaugeV5Interface.encodeFunctionData(
          'claimable_tokens',
          [userAddress]
        ),
      }));
      const [, res] = await this.multicall.callStatic.aggregate(payload);
      const res0x = res.map((r: string) => (r == '0x' ? '0x0' : r));
      return gaugeAddresses.reduce(
        reduceClaimableTokens(res0x, balAddress),
        {}
      );
    }
    return {};
  }
}
