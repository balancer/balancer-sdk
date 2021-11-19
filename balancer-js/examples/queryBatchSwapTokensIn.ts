import dotenv from 'dotenv';
import { parseFixed } from '@ethersproject/bignumber';
import { BalancerSDK, Network, ConfigSdk, SUBGRAPH_URLS } from '../src/index';
import { AAVE_DAI, AAVE_USDC, AAVE_USDT, STABAL3PHANTOM } from './constants';

dotenv.config();

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