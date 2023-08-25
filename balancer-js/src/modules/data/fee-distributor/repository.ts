import { TokenBalance } from '@/modules/claims/ClaimService';
import { FeeDistributor } from '@/modules/contracts/implementations/feeDistributor';
import { Multicall } from '@/contracts';
import { Interface } from '@ethersproject/abi';
import { getAddress } from '@ethersproject/address';
import { BigNumber } from '@ethersproject/bignumber';
import { Contract } from '@ethersproject/contracts';
import { Provider } from '@ethersproject/providers';
import { formatUnits } from '@ethersproject/units';

export interface FeeDistributorData {
  balAmount: number;
  bbAUsdAmount: number;
  veBalSupply: number;
  bbAUsdPrice: number;
  balAddress: string;
}

export interface BaseFeeDistributor {
  multicallData: (ts: number) => Promise<FeeDistributorData>;
  getClaimableBalances(
    userAddress: string,
    claimableTokens: string[]
  ): Promise<TokenBalance>;
  claimBalances(userAddress: string, claimableTokens: string[]): string;
}

const feeDistributorInterface = new Interface([
  'function getTokensDistributedInWeek(address token, uint timestamp) view returns (uint)',
  'function claimTokens(address user, address[] tokens) returns (uint256[])',
  'function claimToken(address user, address token) returns (uint256)',
]);

const veBalInterface = new Interface([
  'function totalSupply() view returns (uint)',
]);

// const bbAUsdInterface = new Interface([
//   'function getRate() view returns (uint)',
// ]);

export class FeeDistributorRepository implements BaseFeeDistributor {
  feeDistributor: Contract;
  data?: FeeDistributorData;

  constructor(
    private multicall: Multicall,
    private feeDistributorAddress: string,
    private balAddress: string,
    private veBalAddress: string,
    private bbAUsdAddress: string,
    provider: Provider
  ) {
    this.feeDistributor = FeeDistributor(feeDistributorAddress, provider);
  }

  async fetch(timestamp: number): Promise<FeeDistributorData> {
    const previousWeek = this.getPreviousWeek(timestamp);
    const payload = [
      {
        target: this.feeDistributorAddress,
        callData: feeDistributorInterface.encodeFunctionData(
          'getTokensDistributedInWeek',
          [getAddress(this.balAddress), previousWeek]
        ),
      },
      {
        target: this.feeDistributorAddress,
        callData: feeDistributorInterface.encodeFunctionData(
          'getTokensDistributedInWeek',
          [getAddress(this.bbAUsdAddress), previousWeek]
        ),
      },
      {
        target: this.veBalAddress,
        callData: veBalInterface.encodeFunctionData('totalSupply', []),
      },
      // Removed while wrappers are broken
      // {
      //   target: this.bbAUsdAddress,
      //   callData: bbAUsdInterface.encodeFunctionData('getRate', []),
      // },
    ];
    const [, res] = await this.multicall.callStatic.aggregate(payload);

    const data = {
      balAmount: parseFloat(formatUnits(res[0], 18)),
      bbAUsdAmount: parseFloat(formatUnits(res[1], 18)),
      veBalSupply: parseFloat(formatUnits(res[2], 18)),
      // bbAUsdPrice: parseFloat(formatUnits(res[3], 18)),
      bbAUsdPrice: parseFloat('1.0'),
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

  async getClaimableBalances(
    userAddress: string,
    claimableTokens: string[]
  ): Promise<TokenBalance> {
    try {
      const amounts: BigNumber[] =
        await this.feeDistributor.callStatic.claimTokens(
          userAddress,
          claimableTokens
        );
      return this.extractTokenBalance(claimableTokens, amounts);
    } catch (e) {
      return {};
    }
  }

  claimBalances(userAddress: string, claimableTokens: string[]): string {
    return feeDistributorInterface.encodeFunctionData('claimTokens', [
      userAddress,
      claimableTokens,
    ]);
  }

  extractTokenBalance(
    claimableTokens: string[],
    amounts: (BigNumber | undefined | null)[]
  ): TokenBalance {
    return claimableTokens.reduce((tokens: TokenBalance, token, index) => {
      tokens[token] = (amounts[index] as BigNumber) ?? BigNumber.from(0);
      return tokens;
    }, {});
  }
}
