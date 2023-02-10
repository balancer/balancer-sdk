import * as dotenv from 'dotenv';
import { Network } from '@/lib/constants';
import { ADDRESSES } from '@/test/lib/constants';
import { BALANCER_NETWORK_CONFIG } from '@/lib/constants/config';
import { ethers } from 'hardhat';
import { BalancerSDK } from '@/modules/sdk.module';

dotenv.config();

const network = Network.GOERLI;

let rpcUrl = `${process.env.ALCHEMY_URL_GOERLI}`;
if ((network as Network) == Network.BSCTESTNET) {
  rpcUrl = `${process.env.GETBLOCK_URL_TEST}`;
} else if ((network as Network) == Network.BSC) {
  rpcUrl = `${process.env.GETBLOCK_URL}`;
}

export const name = 'Bobby Pool';
export const symbol = 'BOBBY';

export const addresses = ADDRESSES[network];

// DON'T FORGET TO CHANGE THIS when switching networks!
export const wrappedNativeAsset = addresses.WETH.address;

export const token1_address = addresses.WETH.address;
export const token2_address = addresses.MAI.address;

export const factoryAddress = `${BALANCER_NETWORK_CONFIG[network].addresses.contracts.weightedPoolFactory}`;
export const owner = '0xfEB47392B746dA43C28683A145237aC5EC5D554B'; // Test Account
export const tokenAddresses = [token1_address, token2_address];

export const rateProviders = [
  '0x0000000000000000000000000000000000000000',
  '0x0000000000000000000000000000000000000000',
];
export const swapFee = '0.01';
export const weights = [`${0.2e18}`, `${0.8e18}`]; // 20% token1 - 80% token2

export const provider = new ethers.providers.JsonRpcProvider(rpcUrl, network);
export const wallet = new ethers.Wallet(`${process.env.TRADER_KEY}`, provider);
export const sdkConfig = {
  network: network,
  rpcUrl: rpcUrl,
};
export const balancer = new BalancerSDK(sdkConfig);
