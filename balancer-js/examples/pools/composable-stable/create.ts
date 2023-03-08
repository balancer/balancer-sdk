import * as dotenv from 'dotenv';
import {
  JsonRpcProvider,
  Log,
  TransactionReceipt,
} from '@ethersproject/providers';
import { BalancerSDK, isSameAddress, Network, PoolType } from 'src';
import composableStableFactoryAbi from '@/lib/abi/ComposableStableFactory.json';
import { ethers } from 'hardhat';
import { Interface, LogDescription } from '@ethersproject/abi';
import { ADDRESSES } from '@/test/lib/constants';
import { forkSetup } from '@/test/lib/utils';
import { BALANCER_NETWORK_CONFIG } from '@/lib/constants/config';
import { parseFixed } from '@ethersproject/bignumber';

dotenv.config();

const network = Network.MAINNET;
const alchemyRpcUrl = `${process.env.ALCHEMY_URL}`;
const blockNumber = 16720000;
const rpcUrl = 'http://127.0.0.1:8545';
// const rpcUrl = `https://mainnet.infura.io/v3/444153f7f8f2499db7be57a11b1f696e`;
// const rpcUrl = 'https://goerli.gateway.tenderly.co/4Rzjgxiyt0WELoXRl1312Q'
export const provider: JsonRpcProvider = new ethers.providers.JsonRpcProvider(
  rpcUrl,
  network
);
export const signer = provider.getSigner();
const sdkConfig = {
  network,
  rpcUrl,
};

// await forkSetupLocalNode(signer);

export const balancer = new BalancerSDK(sdkConfig);

const name = 'My-Test-Pool-Name';
const symbol = 'My-Test-Pool-Symbol';
export const addresses = ADDRESSES[network];

const USDC_address = addresses.USDC.address;
const USDC_slot = addresses.USDC.slot;
const USDT_address = addresses.USDT.address;
const USDT_slot = addresses.USDT.slot;

export const tokenAddresses = [USDC_address, USDT_address];
const slots = [USDC_slot, USDT_slot];
const initialBalances = [
  parseFixed('1000000000', addresses.USDC.decimals).toString(),
  parseFixed('1000000000', addresses.USDT.decimals).toString(),
];

const amplificationParameter = '1';

const rateProviders = [
  '0x0000000000000000000000000000000000000000',
  '0x0000000000000000000000000000000000000000',
];

const tokenRateCacheDurations = ['0', '0'];
const exemptFromYieldProtocolFeeFlags = [false, false];
const swapFee = '0.01';

const owner = '0x817b6923f3cB53536859b1f01262d0E7f513dB78';
const factoryAddress = `${BALANCER_NETWORK_CONFIG[network].addresses.contracts.composableStablePoolFactory}`;

async function createComposableStablePool() {
  await forkSetup(
    signer,
    tokenAddresses,
    slots,
    initialBalances,
    alchemyRpcUrl,
    blockNumber,
    false
  );
  const composableStablePoolFactory = balancer.pools.poolFactory.of(
    PoolType.ComposableStable
  );
  const { to, data } = composableStablePoolFactory.create({
    factoryAddress,
    name,
    symbol,
    tokenAddresses,
    amplificationParameter,
    rateProviders,
    tokenRateCacheDurations,
    exemptFromYieldProtocolFeeFlags,
    swapFee,
    owner,
  });

  const signerAddress = await signer.getAddress();

  const tx = await signer.sendTransaction({
    from: signerAddress,
    to,
    data,
    gasLimit: 6721975,
  });

  const receipt: TransactionReceipt = await provider.getTransactionReceipt(
    tx.hash
  );

  const composableStableFactoryInterface = new Interface(
    composableStableFactoryAbi
  );

  const poolCreationEvent: LogDescription | null | undefined = receipt.logs
    .filter((log: Log) => {
      return isSameAddress(log.address, factoryAddress);
    })
    .map((log) => {
      return composableStableFactoryInterface.parseLog(log);
    })
    .find((parsedLog) => parsedLog?.name === 'PoolCreated');

  if (!poolCreationEvent) return console.error("There's no event");
  console.log('poolAddress: ' + poolCreationEvent.args.pool);
  return poolCreationEvent.args.pool;
}

export default createComposableStablePool();
