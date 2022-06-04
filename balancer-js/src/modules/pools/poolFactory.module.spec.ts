import dotenv from 'dotenv';
import { expect } from 'chai';
import {
    BalancerSdkConfig,
    Network,
    BalancerSDK,
    SeedToken,
} from '@/.';
import { ADDRESSES } from '@/test/lib/constants';
import { TransactionResponse } from '@ethersproject/providers';

dotenv.config();

const sdkConfig: BalancerSdkConfig = {
    network: Network.KOVAN,
    rpcUrl: `https://kovan.infura.io/v3/${process.env.INFURA}`,
};

const SEED_TOKENS: Array<SeedToken> = [ 
    { id: 0, tokenAddress: ADDRESSES[42].DAI.address, weight: 30, isLocked: false, amount: "200000000" }, 
    { id: 1, tokenAddress: ADDRESSES[42].USDC.address, weight: 40, isLocked: false, amount: "200000000" },
    { id: 2, tokenAddress: ADDRESSES[42].WBTC.address, weight: 30, isLocked: false, amount: "200000000" } 
];

const POOL_TYPES = [
    "WeightedPoolFactory",
    "WeightedPool2TokensFactory",
    "StablePoolFactory",
    "LiquidityBootstrappingPoolFactory",
    "MetaStablePoolFactory",
    "InvestmentPoolFactory",
    "StablePhantomPoolFactory",
    "AaveLinearPoolFactory",
    "ERC4626LinearPoolFactory",
    "NoProtocolFeeLiquidityBootstrappingPoolFactory"
];
const POOL_PARAMS = {
    name: "WeightedPoolFactory",
    symbol: "WPOOL",
    initialFee: "0.1",
    seedTokens: SEED_TOKENS,
    owner: "0x0000000000000000000000000000000000000001",
    value: "0.1",
}
const poolFactoryContract = ""

describe('pool factory module', () => {
    context('getCreationTxParams', () => {
        let balancer: BalancerSDK
        beforeEach(async () => {
            balancer = new BalancerSDK(sdkConfig);
            POOL_PARAMS.name = POOL_TYPES[0]
        })
        it('should return the parameters to construct a transaction', async () => {
            const creationTxParams = await balancer.pools.weighted.getCreationTxParams(POOL_PARAMS);
            expect(creationTxParams.err).to.not.eq(true);
            expect(creationTxParams.attributes.name).to.eq('30DAI-40USDC-30WBTC')
            expect(creationTxParams.to).to.equal(poolFactoryContract);
            expect(creationTxParams.data).to.equal(true);
            expect(creationTxParams.value).to.equal(true);
        });
        it('should return an attributes object for the expected pool', async () => {
            const { attributes, err } = await balancer.pools.weighted.getCreationTxParams(POOL_PARAMS);
            expect(err).to.not.eq(true);
            expect(attributes.name).to.eq('30DAI-40USDC-30WBTC')
            expect(attributes.owner).to.eq('0x0000000000000000000000000000000000000001')
            expect(attributes.swapFee).to.eq('0.1')
            expect(attributes.symbol).to.eq('WPOOL')
            expect(attributes.tokens).to.eql(SEED_TOKENS)
        });
        it('should not create a pool if weight of seed tokens is not equal to 100', async () => {
            const params = { ...POOL_PARAMS }
            params.seedTokens[1].weight = 10
            const creationTxParams = await balancer.pools.weighted.getCreationTxParams(params);
            expect(creationTxParams.err).to.eq(true);
        })
    });

    context('handleCreation', async () => {
        let balancer: BalancerSDK
        beforeEach(async () => {
            balancer = new BalancerSDK(sdkConfig);
            POOL_PARAMS.name = POOL_TYPES[0]
        })
        it('should return the pool ID from the issuing transaction', async () => {
            const tx = { hash: "0x1234543211111111111111111111111111111111111111111111" } as TransactionResponse
            const { id, address } = await balancer.pools.getPoolInfoFromCreateTx(tx);
            expect(id).to.equal(1)
            expect(address).to.equal(0x0000000000000000000000000000000000000001)
        })

        it('should return error if no transaction at given hash', () => {
            const tx = { hash: "0x1234543200000000000000000000000000000000000000000000" } as TransactionResponse
            return balancer.pools.getPoolInfoFromCreateTx(tx).then(
                () => Promise.reject(new Error('Expected method to reject.')),
                (err: any) => expect(err).to.equal(true)
            )
        })
    })
});
