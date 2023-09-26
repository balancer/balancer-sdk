import { set } from 'lodash';
import { Fragment, JsonFragment, Interface, Result } from '@ethersproject/abi';
import { CallOverrides } from '@ethersproject/contracts';
import { Multicall3, Multicall3__factory } from '@/contracts';
import { Provider } from '@ethersproject/providers';

export class Multicaller3 {
  private interface: Interface;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private calls: [string, string, any][] = [];
  private paths: string[] = [];
  address = '0xcA11bde05977b3631167028862bE2a173976CA11';
  multicall: Multicall3;

  constructor(
    abi: string | Array<Fragment | JsonFragment | string>,
    provider: Provider,
    private options: CallOverrides = {}
  ) {
    this.interface = new Interface(abi);
    this.multicall = Multicall3__factory.connect(this.address, provider);
  }

  call(
    path: string,
    address: string,
    functionName: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    params?: any[]
  ): Multicaller3 {
    this.calls.push([address, functionName, params]);
    this.paths.push(path);
    return this;
  }

  async execute(
    from: Record<string, unknown> = {},
    batchSize = 1024 // Define the number of function calls in each batch
  ): Promise<Record<string, unknown>> {
    const obj = from;
    const results = await this.executeMulticall(batchSize);
    results.forEach((result, i) =>
      set(obj, this.paths[i], result.length > 1 ? result : result[0])
    );
    this.calls = [];
    this.paths = [];
    return obj;
  }

  private async executeMulticall(batchSize: number): Promise<Result[]> {
    const numBatches = Math.ceil(this.calls.length / batchSize);
    const results: Result[] = [];

    const batchPromises = [];

    for (let batchIndex = 0; batchIndex < numBatches; batchIndex++) {
      const batchCalls = this.calls.slice(
        batchIndex * batchSize,
        (batchIndex + 1) * batchSize
      );

      const batchRequests = batchCalls.map(
        ([address, functionName, params]) => ({
          target: address,
          allowFailure: true,
          callData: this.interface.encodeFunctionData(functionName, params),
        })
      );

      batchPromises.push(
        this.multicall.callStatic.aggregate3(batchRequests, this.options)
      );
    }

    const batchResults = await Promise.all(batchPromises);

    batchResults.forEach((res, batchIndex) => {
      const offset = batchIndex * batchSize;

      for (let i = 0; i < res.length; i++) {
        const callIndex = offset + i;
        const { success, returnData } = res[i];

        if (success) {
          try {
            const result = this.interface.decodeFunctionResult(
              this.calls[callIndex][1],
              returnData
            );
            results[callIndex] = result;
          } catch (e) {
            console.error('Multicall error', this.paths[callIndex]);
            results[callIndex] = [];
          }
        } else {
          console.error('Failed request in multicall', this.paths[callIndex]);
          results[callIndex] = [];
        }
      }
    });

    return results;
  }
}
