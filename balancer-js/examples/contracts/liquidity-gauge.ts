import { BalancerSDK } from '../../src/modules/sdk.module';
import { Network } from '../../src';
import dotenv from 'dotenv';

dotenv.config();

const sdk = new BalancerSDK(
{ 
    network: Network.GOERLI, 
    rpcUrl: `https://goerli.infura.io/v3/${process.env.INFURA}`
});

async function main() {


}

main();

// npm run examples:run -- ./examples/contracts/liquidity-gauge.ts