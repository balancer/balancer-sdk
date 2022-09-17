export abstract class AbstractSubgraphRepository<T> {
    public abstract query(args: any): Promise<T[]>;
    public abstract get(args: any): Promise<T | undefined>;
    protected abstract mapType(subgraphFragment: any): T;
}