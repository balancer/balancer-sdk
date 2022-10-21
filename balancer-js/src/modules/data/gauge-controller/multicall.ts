import { Interface } from '@ethersproject/abi';
import { getAddress } from '@ethersproject/address';
import { Contract } from '@ethersproject/contracts';
import { Provider } from '@ethersproject/providers';
import { formatUnits } from '@ethersproject/units';
import { Multicall } from '@/modules/contracts/implementations/multicall';

const gaugeControllerInterface = new Interface([
  'function gauge_relative_weight(address gauge, uint timestamp) view returns (uint)',
]);

export class GaugeControllerMulticallRepository {
  multicall: Contract;

  constructor(
    multicallAddress: string,
    private gaugeControllerAddress: string,
    provider: Provider
  ) {
    this.multicall = Multicall(multicallAddress, provider);
  }

  async getRelativeWeights(
    gaugeAddresses: string[],
    timestamp?: number
  ): Promise<{ [gaugeAddress: string]: number }> {
    const payload = gaugeAddresses.map((gaugeAddress) => [
      this.gaugeControllerAddress,
      gaugeControllerInterface.encodeFunctionData('gauge_relative_weight', [
        getAddress(gaugeAddress),
        timestamp || Math.floor(Date.now() / 1000),
      ]),
    ]);
    const [, res] = await this.multicall.aggregate(payload);

    const weights = gaugeAddresses.reduce(
      (p: { [key: string]: number }, a, i) => {
        p[a] ||= parseFloat(formatUnits(res[i], 18));
        return p;
      },
      {}
    );

    return weights;
  }
}
