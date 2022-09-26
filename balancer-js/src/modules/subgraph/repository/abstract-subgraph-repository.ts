export abstract class AbstractSubgraphRepository<T> {
    protected abstract mapType(subgraphFragment: any): T;
    public abstract query(args: any): Promise<T[]>;
    public async get(args: any): Promise<T | undefined> {
        const result = await this.query(args);
        return (result?.length > 0) ? this.mapType(result[0]) : undefined; 
    }
}