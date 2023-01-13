import * as dotenv from "dotenv";
import { Network } from "@/lib/constants";
import { ADDRESSES } from "@/test/lib/constants";
import { BALANCER_NETWORK_CONFIG } from "@/lib/constants/config";

dotenv.config();

export const network = Network.GOERLI;
export const rpcUrl = 'http://127.0.0.1:8000';
export const alchemyRpcUrl = `${ process.env.ALCHEMY_URL_GOERLI }`;
export const blockNumber = 8200000;

export const name = 'My-Test-Pool-Name';
export const symbol = 'My-Test-Pool-Symbol';

export const addresses = ADDRESSES[network];

export const USDC_address = addresses.USDC.address;
export const USDT_address = addresses.USDT.address;

export const factoryAddress = `${ BALANCER_NETWORK_CONFIG[network].addresses.contracts.weightedPoolFactory }`;
export const owner = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
export const tokenAddresses = [USDC_address, USDT_address];
export const swapFee = '0.01';
export const weights = [`${ 0.2e18 }`, `${ 0.8e18 }`];