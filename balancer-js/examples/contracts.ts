import { BalancerSDK } from '../src/modules';

const sdk = new BalancerSDK(
    1,
    'https://mainnet.infura.io/v3/fe20130495ec4f90b0b84b9d9c0a9570'
);

const run = async () => {
    const { vault } = sdk.contracts;
    const address = await vault.WETH();
    console.log(address);
};

run();
