import { Network } from '@/lib/constants/network';
import { AbstractSubgraphRepository  } from './abstract-subgraph-repository';
import { createSubgraphClient, SubgraphClient } from '../subgraph';

export abstract class BalancerSubgraphRepository<T> extends AbstractSubgraphRepository<T> {
   
    protected client: SubgraphClient;
  
    constructor(url: string, 
        protected chainId: Network,     
        protected blockHeight?: () => Promise<number | undefined>    
    ) {
        super();
        this.client = createSubgraphClient(url);
    }
  }