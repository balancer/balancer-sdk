import { BalancerSDK } from '../../src/modules/sdk.module';
import { Network } from '../../src';
import dotenv from 'dotenv';

dotenv.config();

const sdk = new BalancerSDK(
{ 
    network: Network.GOERLI, 
    rpcUrl: `https://goerli.infura.io/v3/${process.env.INFURA}`
});
const { veBal } = sdk.contracts;

async function main() {

    if (!veBal) throw new Error('veBal address must be defined');

    const USER = "0x91F450602455564A64207414c7Fbd1F1F0EbB425";

    const lockInfo = await veBal.getLockInfo(USER);
    console.log("veBAL lock info for user", lockInfo);
}

main();

// npm run examples:run -- ./examples/contracts/veBAL.ts