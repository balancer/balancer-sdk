import {FeeDistributor} from "@/modules/contracts/implementations/feeDistributor";
import { Interface } from '@ethersproject/abi';
import { Provider } from '@ethersproject/providers';
import { Contract } from '@ethersproject/contracts';
import { getAddress } from '@ethersproject/address';
import { formatUnits } from '@ethersproject/units';
import { Multicall } from '@/modules/contracts/implementations/multicall';

export interface FeeDistributorData {
  balAmount: number;
  bbAUsdAmount: number;
  veBalSupply: number;
  bbAUsdPrice: number;
  balAddress: string;
}

export interface BaseFeeDistributor {
  multicallData: (ts: number) => Promise<FeeDistributorData>;
  getClaimableBalances(userAddress: string, claimableTokens: string[]): Promise<{ [key: string]: number }>;
  getClaimableBalance(userAddress: string, claimableToken: string): Promise<number>;
  claimBalances(userAddress: string, claimableTokens: string[]): string;
  claimBalance(userAddress: string, claimableToken: string): string;
}

const feeDistributorInterface = new Interface([
  'function getTokensDistributedInWeek(address token, uint timestamp) view returns (uint)',
  'function claimTokens(address user, address[] tokens) returns (uint256[])',
  'function claimToken(address user, address token) returns (uint256)'
]);

const veBalInterface = new Interface([
  'function totalSupply() view returns (uint)',
]);

const bbAUsdInterface = new Interface([
  'function getRate() view returns (uint)',
]);

export class FeeDistributorRepository implements BaseFeeDistributor {
  multicall: Contract;
  feeDistributor: Contract;
  data?: FeeDistributorData;

  constructor(
    multicallAddress: string,
    private feeDistributorAddress: string,
    private balAddress: string,
    private veBalAddress: string,
    private bbAUsdAddress: string,
    provider: Provider
  ) {
    this.multicall = Multicall(multicallAddress, provider);
    this.feeDistributor = FeeDistributor(feeDistributorAddress, provider);
  }

  async fetch(timestamp: number): Promise<FeeDistributorData> {
    const previousWeek = this.getPreviousWeek(timestamp);
    const payload = [
      [
        this.feeDistributorAddress,
        feeDistributorInterface.encodeFunctionData(
          'getTokensDistributedInWeek',
          [getAddress(this.balAddress), previousWeek]
        ),
      ],
      [
        this.feeDistributorAddress,
        feeDistributorInterface.encodeFunctionData(
          'getTokensDistributedInWeek',
          [getAddress(this.bbAUsdAddress), previousWeek]
        ),
      ],
      [this.veBalAddress, veBalInterface.encodeFunctionData('totalSupply', [])],
      [this.bbAUsdAddress, bbAUsdInterface.encodeFunctionData('getRate', [])],
    ];
    const [, res] = await this.multicall.aggregate(payload);

    const data = {
      balAmount: parseFloat(formatUnits(res[0], 18)),
      bbAUsdAmount: parseFloat(formatUnits(res[1], 18)),
      veBalSupply: parseFloat(formatUnits(res[2], 18)),
      bbAUsdPrice: parseFloat(formatUnits(res[3], 18)),
      balAddress: this.balAddress,
    };

    return data;
  }

  async multicallData(timestamp: number): Promise<FeeDistributorData> {
    if (!this.data) {
      this.data = await this.fetch(timestamp);
    }

    return this.data;
  }

  getPreviousWeek(fromTimestamp: number): number {
    const weeksToGoBack = 1;
    const midnight = new Date(fromTimestamp);
    midnight.setUTCHours(0);
    midnight.setUTCMinutes(0);
    midnight.setUTCSeconds(0);
    midnight.setUTCMilliseconds(0);

    let daysSinceThursday = midnight.getUTCDay() - 4;
    if (daysSinceThursday < 0) daysSinceThursday += 7;

    daysSinceThursday = daysSinceThursday + weeksToGoBack * 7;

    return Math.floor(midnight.getTime() / 1000) - daysSinceThursday * 86400;
  }

  async getClaimableBalances(userAddress: string, claimableTokens: string[]): Promise<{ [key: string]: number }> {
    const amounts = await this.feeDistributor.callStatic.claimTokens(userAddress, claimableTokens);
    return claimableTokens.reduce((tokens: { [key:string]:number }, token, index) => {
      tokens[token] = amounts[index];
      return tokens;
    }, {});
  }

  claimBalances(userAddress: string, claimableTokens: string[]): string {
    return feeDistributorInterface.encodeFunctionData('claimTokens', [userAddress, claimableTokens]);
  }

  async getClaimableBalance(userAddress: string, claimableToken: string): Promise<number> {
    return await this.feeDistributor.claimTokens(userAddress, claimableToken);
  }

  claimBalance(userAddress: string, claimableToken: string): string {
    return feeDistributorInterface.encodeFunctionData('claimToken', [userAddress, claimableToken]);
  }

}
