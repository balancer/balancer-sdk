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

const INIT_JOIN_PARAMS = {
    poolId: 200,
    sender: "0x0000000000000000000000000000000000000001",
    receiver: "0x0000000000000000000000000000000000000002",
    tokenAddresses: [ADDRESSES[42].DAI.address, ADDRESSES[42].USDC.address, ADDRESSES[42].WBTC.address],
    initialBalancesString: ["2000000000000000000", "2000000000000000000", "2000000000000000000"],
}

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
const vaultAddress = ""

describe('pool factory module', () => {
    context('getCreationTxParams', () => {
        let balancer: BalancerSDK
        beforeEach(async () => {
            balancer = new BalancerSDK(sdkConfig);
            POOL_PARAMS.name = POOL_TYPES[0]
        })
        it('should return the parameters to construct a transaction', async () => {
            const creationTxAttributes = await balancer.pools.weighted.buildCreateTx(POOL_PARAMS);
            expect(creationTxAttributes.err).to.not.eq(true);
            expect(creationTxAttributes.to).to.equal(poolFactoryAddresses.weighted);
            expect(creationTxAttributes.data).to.equal(
                '0xfbce039300000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000001c0000000000000000000000000000000000000000000000000016345785d8a0000000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000135765696768746564506f6f6c466163746f727900000000000000000000000000000000000000000000000000000000000000000000000000000000000000000557504f4f4c000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000300000000000000000000000004df6e4121c27713ed22341e7c7df330f56f289b000000000000000000000000c2569dd7d0fd715b054fbf16e75b001e5c0c11150000000000000000000000001c8e3bcb3378a443cc591f154c5ce0ebb4da96480000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000001e0000000000000000000000000000000000000000000000000000000000000028000000000000000000000000000000000000000000000000000000000000001e'
            );
            expect(creationTxAttributes.value?.toString()).to.equal('100000000000000000');
        });
        it('should return an attributes object for the expected pool', async () => {
            const { attributes, err } = await balancer.pools.weighted.buildCreateTx(POOL_PARAMS);
            expect(err).to.not.eq(true);
            expect(attributes.name).to.eq('30DAI-40USDC-30WBTC')
            expect(attributes.owner).to.eq('0x0000000000000000000000000000000000000001')
            expect(attributes.swapFee).to.eq('0.1')
            expect(attributes.symbol).to.eq('WPOOL')
            expect(attributes.tokens).to.eql(SEED_TOKENS)
        });
        it('should not create a pool if weight of seed tokens do not add to 100', async () => {
            const params = { ...POOL_PARAMS }
            params.seedTokens[1].weight = 10
            const creationTxParams = await balancer.pools.weighted.buildCreateTx(params);
            expect(creationTxParams.err).to.eq(true);
        })
    });

    context('getPoolInfoFromCreateTx', async () => {
        let balancer: BalancerSDK
        beforeEach(async () => {
            balancer = new BalancerSDK(sdkConfig);
        })
        it('should return the pool ID from the issuing transaction', async () => {
            const tx = { hash: "0x1234543211111111111111111111111111111111111111111111" } as TransactionResponse
            const { id, address } = await balancer.pools.getPoolInfoFromCreateTx(tx) as { id: number, address: string };
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

    context('buildInitJoin', async () => {
        let balancer: BalancerSDK
        beforeEach(async () => {
            balancer = new BalancerSDK(sdkConfig);
        })
        it('should return transaction attributes for an InitJoin', async () => {
            const transactionAttributes = await balancer.pools.weighted.buildInitJoin(INIT_JOIN_PARAMS);
            expect(transactionAttributes.err).to.not.eq(true);
            expect(transactionAttributes.data).to.eq('0x123')
            expect(transactionAttributes.to).to.equal(vaultAddress);
            expect(transactionAttributes.value).to.equal(true);
        });
    })
});
