import * as dotenv from 'dotenv';
import { Network } from '@/lib/constants';
import { ADDRESSES } from '@/test/lib/constants';
import { BALANCER_NETWORK_CONFIG } from '@/lib/constants/config';
import { ethers } from 'hardhat';
import { BalancerSDK } from '@/modules/sdk.module';

dotenv.config();

export const network = Network.BSCTESTNET;

let rpcUrl = `${process.env.ALCHEMY_URL_GOERLI}`;
export let wrappedNativeAsset = '0xdfcea9088c8a88a76ff74892c1457c17dfeef9c1';

if ((network as Network) == Network.BSCTESTNET) {
  rpcUrl = `${process.env.GETBLOCK_URL_TEST}`;
  wrappedNativeAsset = '0xE906CBeCd4A17DF62B8d6c8C82F3882af25295f5';
} else if ((network as Network) == Network.BSC) {
  rpcUrl = `${process.env.GETBLOCK_URL}`;
  wrappedNativeAsset = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
}

export const name = 'Bobby Pool';
export const symbol = 'BOBBY';

export const addresses = ADDRESSES[network];

export const tokenSymbols = ['USDC', 'USDT'];
export const tokenAmounts = ['3', '3'];

export const owner = '0xfEB47392B746dA43C28683A145237aC5EC5D554B'; // Test Account

export const rateProviders = [
  '0x0000000000000000000000000000000000000000',
  '0x0000000000000000000000000000000000000000',
];
export const swapFee = '0.01';
export const weights = [`${0.5e18}`, `${0.5e18}`]; // 50% token1 - 50% token2

export const provider = new ethers.providers.JsonRpcProvider(rpcUrl, network);
export const wallet = new ethers.Wallet(`${process.env.TRADER_KEY}`, provider);

export const factoryAddress = `${BALANCER_NETWORK_CONFIG[network].addresses.contracts.weightedPoolFactory}`;

export const sdkConfig = {
  network: network,
  rpcUrl: rpcUrl,
};
export const balancer = new BalancerSDK(sdkConfig);
