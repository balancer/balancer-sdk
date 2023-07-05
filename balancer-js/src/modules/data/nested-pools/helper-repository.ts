import { JsonRpcProvider } from '@ethersproject/providers';
import { Interface } from '@ethersproject/abi';
import { Contract } from '@ethersproject/contracts';
import { Findable } from '../types';

const iHelper = new Interface([
  'function poolTokens(bytes32 id) view returns ((bytes32 parentId, bytes32 poolId, string version, address address, uint256 balance, uint256 decimals, uint256 weight, uint256 priceRate, uint256 totalSupply, uint256 swapFee, address mainToken)[] poolTokens)',
]);

interface HelperResponse {
  parentId: string;
  poolId: string;
  version: string;
  address: string;
  balance: string;
  decimals: number;
  weight: string;
  priceRate: string;
  totalSupply: string;
  swapFee: string;
  mainToken: string;
}

export interface HelperPoolToken {
  parentId: string;
  address: string;
  balance: string
  decimals: number
  weight: string
  priceRate: string;
  pool?: {
    id: string;
    version: {
      name: string
      version: number
      deployment: string
    };
    totalSupply: string
    swapFee: string
    mainToken: string;
  }
}

interface HelperPoolTokenRepositoryConstructor {
  helperAddress: string;
  provider: JsonRpcProvider;
}

export class HelperPoolTokenRepository implements Findable<HelperPoolToken[]> {
  helper: Contract;

  constructor({
    helperAddress,
    provider,
  }: HelperPoolTokenRepositoryConstructor) {
    this.helper = new Contract(helperAddress, iHelper, provider);
  }

  async find(id: string): Promise<HelperPoolToken[]> {
    const response: HelperResponse[] = await this.helper.poolTokens(id);

    console.log(response[0])

    return response.map(
      ({
        parentId,
        poolId,
        version,
        address,
        balance,
        decimals,
        weight,
        priceRate,
        totalSupply,
        swapFee,
        mainToken,
      }) => ({
        parentId,
        address,
        balance,
        decimals,
        weight,
        priceRate,
        pool: poolId && {
          id: poolId,
          version: version && JSON.parse(version),
          totalSupply,
          swapFee,
          mainToken,
        } || undefined,
      })
    );
  }

  async findBy(param: string, value: string): Promise<HelperPoolToken[]> {
    if (param === 'id') {
      return this.find(value);
    } else {
      throw new Error(`Cannot find by ${param}`);
    }
  }
}
