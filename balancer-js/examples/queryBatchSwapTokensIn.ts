import dotenv from 'dotenv';
import { parseFixed } from '@ethersproject/bignumber';
import { BalancerSDK, Network, ConfigSdk, SUBGRAPH_URLS } from '../src/index';

dotenv.config();

interface TestToken {
    address: string;
    decimals: number;
}

// Kovan version
const STABAL3PHANTOM: TestToken = {
    address: '0x21ff756ca0cfcc5fff488ad67babadffee0c4149',
    decimals: 18,
};

// Kovan version
const AAVE_USDT: TestToken = {
    address: '0x13512979ade267ab5100878e2e0f485b568328a4',
    decimals: 6,
};

// Kovan version
const AAVE_USDC: TestToken = {
    address: '0xe22da380ee6b445bb8273c81944adeb6e8450422',
    decimals: 6,
};

// Kovan version
const AAVE_DAI: TestToken = {
    address: '0xff795577d9ac8bd7d90ee22b6c1703490b6512fd',
    decimals: 18,
};

async function runQueryBatchSwapTokensIn() {
    const config: ConfigSdk = {
        network: Network.KOVAN,
        rpcUrl: `https://kovan.infura.io/v3/${process.env.INFURA}`,
        subgraphUrl: SUBGRAPH_URLS[Network.KOVAN]
    } 
    console.log(config.subgraphUrl);
    const balancer = new BalancerSDK(config);

    const queryResult = await balancer.swaps.queryBatchSwapTokensIn(
        [AAVE_DAI.address, AAVE_USDC.address, AAVE_USDT.address],
        [parseFixed('100', 18), parseFixed('100', 6), parseFixed('100', 6)],
        STABAL3PHANTOM.address
    );
    console.log(queryResult.swaps);
    console.log(queryResult.assets);
    console.log(queryResult.amountTokenOut.toString()); 
}

// ts-node ./examples/queryBatchSwapTokensIn.ts
runQueryBatchSwapTokensIn();