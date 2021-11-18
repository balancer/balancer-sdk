import dotenv from 'dotenv';
import { parseFixed } from '@ethersproject/bignumber';
import { BalancerSDK, Network, ConfigSdk, SUBGRAPH_URLS } from '../src/index';
import { AAVE_DAI, AAVE_USDC, AAVE_USDT, STABAL3PHANTOM } from './constants';

dotenv.config();

async function runQueryBatchSwapTokensOut() {
    const config: ConfigSdk = {
        network: Network.KOVAN,
        rpcUrl: `https://kovan.infura.io/v3/${process.env.INFURA}`,
        subgraphUrl: SUBGRAPH_URLS[Network.KOVAN]
    } 
    console.log(config.subgraphUrl);
    const balancer = new BalancerSDK(config);

    const queryResult = await balancer.swaps.queryBatchSwapTokensOut(
        STABAL3PHANTOM.address,
        [parseFixed('1', 18), parseFixed('1', 18), parseFixed('1', 18)],
        [AAVE_DAI.address, AAVE_USDC.address, AAVE_USDT.address],
    );
    console.log(queryResult.swaps);
    console.log(queryResult.assets);
    console.log(queryResult.amountTokensOut.toString()); 
}

// ts-node ./examples/queryBatchSwapTokensOut.ts
runQueryBatchSwapTokensOut();