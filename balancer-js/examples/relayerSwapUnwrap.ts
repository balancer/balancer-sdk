import dotenv from 'dotenv';
import { parseFixed } from '@ethersproject/bignumber';
import { Wallet } from '@ethersproject/wallet';
import { JsonRpcProvider } from '@ethersproject/providers';
import { Contract } from '@ethersproject/contracts';

import { BalancerSDK, Network, ConfigSdk, SUBGRAPH_URLS } from '../src/index';
import { FundManagement } from '../src/swapsService/types';
import { WRAPPED_AAVE_DAI, WRAPPED_AAVE_USDC, WRAPPED_AAVE_USDT, STABAL3PHANTOM } from './constants';

import balancerRelayerAbi from '../src/abi/BalancerRelayer.json';

dotenv.config();

/*
Example showing how to exit bb-a-USDC to stables via Relayer.
User must approve relayer
Vault must have approvals for tokens
*/
async function runRelayerSwapUnwrap() {
    const config: ConfigSdk = {
        network: Network.KOVAN,
        rpcUrl: `https://kovan.infura.io/v3/${process.env.INFURA}`,
        subgraphUrl: SUBGRAPH_URLS[Network.KOVAN]
    } 

    const balancer = new BalancerSDK(config);
    
    const provider = new JsonRpcProvider(config.rpcUrl);
    const key: any = process.env.TRADER_KEY;
    const relayerAddress = '0x3C255DE4a73Dd251A33dac2ab927002C964Eb2cB';
    const wallet = new Wallet(key, provider);
    const funds: FundManagement = {
        sender: wallet.address,
        recipient: relayerAddress, // Note relayer is recipient of swaps
        fromInternalBalance: false,
        toInternalBalance: false,
    };

    const txInfo = await balancer.relayer.swapUnwrapExactIn(
        [STABAL3PHANTOM.address, STABAL3PHANTOM.address, STABAL3PHANTOM.address],
        [parseFixed('1', 16), parseFixed('1', 16), parseFixed('1', 16)],
        [WRAPPED_AAVE_DAI.address, WRAPPED_AAVE_USDC.address, WRAPPED_AAVE_USDT.address],
        ['1151626718944406465', '1007040195062713031', '1000680737603270490'],
        funds,
        '50000000000000000' // Slippage 5%
    );

    const relayerContract = new Contract(relayerAddress, balancerRelayerAbi, provider);
    const tx = await relayerContract.connect(wallet)[txInfo.function](txInfo.params, {
        value: '0',
        // gasLimit: '200000',
    });
    console.log(tx); 
}

// ts-node ./examples/relayerSwapUnwrap.ts
runRelayerSwapUnwrap();