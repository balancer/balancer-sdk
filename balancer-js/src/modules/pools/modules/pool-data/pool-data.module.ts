import {
    SubgraphClient,
    SubgraphPoolFragment,
} from '@/modules/subgraph/subgraph';

export class PoolData {
    constructor(private readonly subgraphClient: SubgraphClient) {}

    public async fetchAll(): Promise<SubgraphPoolFragment[]> {
        const { pools } = await this.subgraphClient.Pools({ first: 10 });
        return pools;
    }
}
