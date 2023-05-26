import { Interface } from '@ethersproject/abi';
import { getAddress } from '@ethersproject/address';
import { formatUnits } from '@ethersproject/units';
import { Multicall } from '@/contracts';

const gaugeControllerInterface = new Interface([
  'function gauge_relative_weight(address gauge, uint timestamp) view returns (uint)',
]);

export class GaugeControllerMulticallRepository {
  constructor(
    private multicall: Multicall,
    private gaugeControllerAddress: string
  ) {}

  async getRelativeWeights(
    gaugeAddresses: string[],
    timestamp?: number
  ): Promise<{ [gaugeAddress: string]: number }> {
    const payload = gaugeAddresses.map((gaugeAddress) => ({
      target: this.gaugeControllerAddress,
      callData: gaugeControllerInterface.encodeFunctionData(
        'gauge_relative_weight',
        [getAddress(gaugeAddress), timestamp || Math.floor(Date.now() / 1000)]
      ),
    }));
    const [, res] = await this.multicall.callStatic.aggregate(payload);

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
