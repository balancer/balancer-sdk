import { BalancerSDK } from '../../src/modules/sdk.module';
import { Network } from '../../src';
import dotenv from 'dotenv';
import { JsonRpcProvider } from '@ethersproject/providers';
import { Wallet } from '@ethersproject/wallet';
import { formatUnits } from '@ethersproject/units';
import { One } from '@ethersproject/constants';

dotenv.config();

const config = { 
    network: Network.GOERLI, 
    rpcUrl: `https://goerli.infura.io/v3/${process.env.INFURA}`
}
const sdk = new BalancerSDK(config);
const { contracts } = sdk;

// Prerequisite: user must have approved the transfer of his LP tokens by the gauge

async function deposit() {
    const GAUGE_ADDRESS = '0x0fc855f77ce75bb6a5d650d0c4cc92e460c03e25';
    const { TRADER_ADDRESS, TRADER_KEY } = process.env;

    if (!TRADER_ADDRESS || !TRADER_KEY) throw new Error('Trader infos must be defined'); 

    const provider = new JsonRpcProvider(config.rpcUrl);
    const signer = new Wallet(TRADER_KEY, provider);

    const contract = contracts.liquidityGauge(GAUGE_ADDRESS, signer);

    let balance = await contract.balanceOf(TRADER_ADDRESS);
    console.log('User balance before :', formatUnits(balance, 0));

    console.log('Deposing 1 wei in gauge. Wait ...');
    const tx = await contract.functions['deposit(uint256)'](One);
    await tx.wait();

    balance = await contract.balanceOf(TRADER_ADDRESS);
    console.log('User balance after :', formatUnits(balance, 0));
}

deposit();

// npm run examples:run -- ./examples/contracts/liquidity-gauge.ts