import { Network } from '@/lib/constants/network';
import { AbstractSubgraphRepository } from './abstract-subgraph-repository';
import { createGaugesClient, GaugesClient } from '../subgraph';

export abstract class GaugesSubgraphRepository<
  T,
  A
> extends AbstractSubgraphRepository<T, A> {
  protected client: GaugesClient;

  constructor(
    url: string,
    protected chainId: Network,
    protected blockHeight?: () => Promise<number | undefined>
  ) {
    super();
    this.client = createGaugesClient(url);
  }
}
