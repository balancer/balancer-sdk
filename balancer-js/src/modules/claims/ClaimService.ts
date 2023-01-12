import {BalancerError, BalancerErrorCode} from "@/balancerErrors";
import {Network} from "@/lib/constants";
import {BALANCER_NETWORK_CONFIG} from "@/lib/constants/config";
import {Multicall} from "@/modules/contracts/implementations/multicall";
import {LiquidityGauge, LiquidityGaugeSubgraphRPCProvider} from "@/modules/data";
import {Interface} from '@ethersproject/abi';
import {Contract} from "@ethersproject/contracts";
import {Provider} from "@ethersproject/providers";
import {
  GaugeTokens,
  populateGauges,
  reduceClaimableRewards,
  reduceClaimableTokens,
  reduceRewardTokens,
  Tokens
} from "./helper";

const liquidityGaugeV5Interface = new Interface([
  'function claim_rewards(address sender, address receiver) view returns (uint256)',
  'function claimable_tokens(address addr) view returns (uint256)',
  'function claimable_reward(address addr, address token) view returns (uint256)',
]);

const gaugeClaimHelperInterface = new Interface([
  'function getPendingRewards(address gauge, address user, address token) view returns (uint256)',
  'function claimRewardsFromGauges(address[] gauges, address user)'
]);

export interface TransactionData {
  to: string;
  from: string;
  callData: string;
  tokensOut: string[];
  expectedTokensValue: number[];
  functionName: string;
}

export interface IClaimService {
  getClaimableTokens(userAddress: string): Promise<LiquidityGauge[]>;
  claimRewardTokens(gaugeAddresses: string[], userAddress: string, receiverAddress?: string): Promise<TransactionData>;
}


export class ClaimService implements IClaimService{
  private readonly liquidityGauges: LiquidityGaugeSubgraphRPCProvider;
  private readonly multicall: Contract;
  private readonly gaugeClaimHelperAddress?: string;
  private readonly chainId: Network;

  constructor(
    liquidityGauges: LiquidityGaugeSubgraphRPCProvider,
    chainId: Network,
    multicallAddress: string,
    provider: Provider,
    gaugeClaimHelperAddress?: string
  ) {
    this.liquidityGauges = liquidityGauges;
    this.chainId = chainId;
    this.gaugeClaimHelperAddress = gaugeClaimHelperAddress;
    this.multicall = Multicall(multicallAddress, provider);
  }

  async getClaimableTokens(userAddress: string): Promise<(LiquidityGauge)[]> {
    const gauges = await this.getGauges();
    if (!gauges.length) throw new BalancerError(BalancerErrorCode.GAUGES_NOT_FOUND);

    const gaugeAddresses = gauges.map((it) => it.address);
    const rewardTokens = this.getRewardTokens(gauges);

    const claimableTokens = await this.retrieveClaimableTokens(gaugeAddresses, userAddress);
    const claimableRewards = await this.retrieveClaimableRewards(rewardTokens, userAddress);
    return populateGauges(gauges, claimableRewards, claimableTokens);
  }

  async claimRewardTokens(gaugeAddresses: string[], userAddress: string, receiverAddress?: string): Promise<TransactionData> {
    const allGauges = await this.getClaimableTokens(userAddress);
    const gauges = allGauges
      .filter((it) => gaugeAddresses.map(it => it.toLowerCase()).includes(it.address.toLowerCase()))
      .filter((it) => it.claimableTokens && Object.keys(it.claimableTokens).length);
    const claimableTokens = Array.from(new Set(gauges.map((gauge) => gauge.claimableTokens).map((tokens) => Object.keys(tokens || {})).flatMap(it => it)));
    const expectedValues = claimableTokens.map((tokenAddress) => {
      return gauges.reduce((value, gauge) => {
        if (gauge.claimableTokens && gauge.claimableTokens[tokenAddress])
          value += gauge.claimableTokens[tokenAddress];
        return value;
      }, 0);
    })
    if (this.chainId === 1 || this.chainId === 5) {
      // prepare data for mainnnet
      const receiver = receiverAddress ?? userAddress;
      const sender = userAddress;
      const payload = [];
      for (const gaugeAddress of gaugeAddresses) {
          payload.push(
            gaugeAddress,
            liquidityGaugeV5Interface.encodeFunctionData('claim_rewards', [sender, receiver]),
          );
      }
      throw new Error('not yet implemented')
    } else {
      try {
        const callData = gaugeClaimHelperInterface.encodeFunctionData('claimRewardsFromGauges', [gaugeAddresses, userAddress]);
        return {
          to: this.gaugeClaimHelperAddress!,
          from: userAddress,
          callData: callData,
          tokensOut: claimableTokens,
          expectedTokensValue: expectedValues,
          functionName: 'claimRewardsFromGauges'
        }
      } catch (e) {
        console.log(e);
        throw e;
      }
    }
  }

  private async getGauges(): Promise<LiquidityGauge[]> {
    return await this.liquidityGauges.fetch();
  }

  private getRewardTokens(gauges: LiquidityGauge[]): { [gaugeAddress: string]: string[] } {
    return gauges.reduce(reduceRewardTokens, {});
  }

  private async retrieveClaimableRewards(
    rewardTokens: { [address: string]: string[] },
    userAddress: string,
  ): Promise<GaugeTokens> {
    const gaugeAddresses = Object.keys(rewardTokens);
    const { payload, paths } = this.getPayload(gaugeAddresses, rewardTokens, userAddress);
    const [, res] = await this.multicall.aggregate(payload);
    const res0x = res.map((r: string) => (r == '0x' ? '0x0' : r));
    return paths.reduce(reduceClaimableRewards(res0x), {});
  }

  private getPayload(gaugeAddresses: string[], rewardTokens: { [address: string]: string[] }, userAddress: string,): { payload: string[][], paths: { gauge: string, token: string }[] } {
    const payload = [];
    const paths: { gauge: string, token: string }[] = [];
    for (const gaugeAddress of gaugeAddresses) {
      for (const tokenAddress of rewardTokens[gaugeAddress]) {
        paths.push({gauge: gaugeAddress, token: tokenAddress});
        payload.push(this.getArguments(userAddress, gaugeAddress, tokenAddress));
      }
    }
    return { payload, paths };
  }

  private getArguments(userAddress: string, gaugeAddress: string, tokenAddress: string): string[] {
    if (this.chainId === 1 || this.chainId === 5) {
      return [
        gaugeAddress,
        liquidityGaugeV5Interface.encodeFunctionData('claimable_reward', [userAddress, tokenAddress]),
      ];
    }
    if (!this.gaugeClaimHelperAddress) throw new BalancerError(BalancerErrorCode.GAUGES_HELPER_ADDRESS_NOT_PROVIDED);
    return [
      this.gaugeClaimHelperAddress,
      gaugeClaimHelperInterface.encodeFunctionData('getPendingRewards', [gaugeAddress, userAddress, tokenAddress]),
    ];
  }

  private async retrieveClaimableTokens(
    gaugeAddresses: string[],
    userAddress: string,
  ): Promise<GaugeTokens> {
    if (this.chainId === Network.MAINNET || this.chainId === Network.GOERLI) {
      const balAddress = BALANCER_NETWORK_CONFIG[this.chainId].addresses.tokens.bal as string;
      const payload = gaugeAddresses.map((gaugeAddress) => [
        gaugeAddress,
        liquidityGaugeV5Interface.encodeFunctionData('claimable_tokens', [userAddress]),
      ]);
      const [, res] = await this.multicall.aggregate(payload);
      const res0x = res.map((r: string) => (r == '0x' ? '0x0' : r));
      return gaugeAddresses.reduce(reduceClaimableTokens(res0x, balAddress), {});
    }
    return {};
  }

}