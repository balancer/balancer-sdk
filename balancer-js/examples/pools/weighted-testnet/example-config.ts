import * as dotenv from 'dotenv';
import { Network } from '@/lib/constants';
import { ADDRESSES } from '@/test/lib/constants';
import { BALANCER_NETWORK_CONFIG } from '@/lib/constants/config';
import { ethers } from 'hardhat';
import { BalancerSDK } from '@/modules/sdk.module';

dotenv.config();

export const network = Network.GOERLI;
export const rpcUrl = `${process.env.ALCHEMY_URL_GOERLI}`;

export const name = 'Puce Pool';
export const symbol = 'PUCE';

export const addresses = ADDRESSES[network];

export const USDC_address = addresses.USDC.address;
export const USDT_address = addresses.USDT.address;

export const factoryAddress = `${BALANCER_NETWORK_CONFIG[network].addresses.contracts.weightedPoolFactory}`;
export const owner = '0xfEB47392B746dA43C28683A145237aC5EC5D554B'; // Test Account
export const tokenAddresses = [USDC_address, USDT_address];

export const rateProviders = [
  '0x0000000000000000000000000000000000000000',
  '0x0000000000000000000000000000000000000000',
];
export const swapFee = '0.01';
export const weights = [`${0.2e18}`, `${0.8e18}`]; // 20% USDC - 80% USDT

export const provider = new ethers.providers.JsonRpcProvider(rpcUrl, network);
export const wallet = new ethers.Wallet(`${process.env.TRADER_KEY}`, provider);
export const sdkConfig = {
  network: network,
  rpcUrl: rpcUrl,
};
export const balancer = new BalancerSDK(sdkConfig);
