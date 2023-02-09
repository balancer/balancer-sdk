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
import { BALANCER_NETWORK_CONFIG } from '@/lib/constants/config';

dotenv.config();

const name = 'Bobby Pool';

const symbol = 'BOBBY';

const network = Network.BSCTESTNET;
const rpcUrl = `${process.env.GETBLOCK_URL_TEST}`;

const addresses = ADDRESSES[network];

const USDC_address = addresses.USDC.address;
const USDT_address = addresses.USDT.address;
const tokenAddresses = [USDC_address, USDT_address];

const amplificationParameter = 1;

const rateProviders = [
  '0x0000000000000000000000000000000000000000',
  '0x0000000000000000000000000000000000000000',
];

const tokenRateCacheDurations = ['0', '0'];

const exemptFromYieldProtocolFeeFlags = [false, false];

const swapFee = 0.01;
const owner = '0xfEB47392B746dA43C28683A145237aC5EC5D554B'; // Test Account
const factoryAddress = `${BALANCER_NETWORK_CONFIG[network].addresses.contracts.composableStablePoolFactory}`;

async function createComposableStablePool() {
  // const rpcUrl = `https://mainnet.infura.io/v3/444153f7f8f2499db7be57a11b1f696e`;
  // const rpcUrl = 'https://goerli.gateway.tenderly.co/4Rzjgxiyt0WELoXRl1312Q'
  const provider = new ethers.providers.JsonRpcProvider(rpcUrl, network);
  const wallet = new ethers.Wallet(`${process.env.TRADER_KEY}`, provider);

  const abi =
    '[{"inputs":[{"internalType":"contract IVault","name":"vault","type":"address"},{"internalType":"contract IProtocolFeePercentagesProvider","name":"protocolFeeProvider","type":"address"},{"internalType":"string","name":"factoryVersion","type":"string"},{"internalType":"string","name":"poolVersion","type":"string"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[],"name":"FactoryDisabled","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"pool","type":"address"}],"name":"PoolCreated","type":"event"},{"inputs":[{"internalType":"string","name":"name","type":"string"},{"internalType":"string","name":"symbol","type":"string"},{"internalType":"contract IERC20[]","name":"tokens","type":"address[]"},{"internalType":"uint256","name":"amplificationParameter","type":"uint256"},{"internalType":"contract IRateProvider[]","name":"rateProviders","type":"address[]"},{"internalType":"uint256[]","name":"tokenRateCacheDurations","type":"uint256[]"},{"internalType":"bool[]","name":"exemptFromYieldProtocolFeeFlags","type":"bool[]"},{"internalType":"uint256","name":"swapFeePercentage","type":"uint256"},{"internalType":"address","name":"owner","type":"address"}],"name":"create","outputs":[{"internalType":"contract ComposableStablePool","name":"","type":"address"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"disable","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes4","name":"selector","type":"bytes4"}],"name":"getActionId","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getAuthorizer","outputs":[{"internalType":"contract IAuthorizer","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getCreationCode","outputs":[{"internalType":"bytes","name":"","type":"bytes"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getCreationCodeContracts","outputs":[{"internalType":"address","name":"contractA","type":"address"},{"internalType":"address","name":"contractB","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getPauseConfiguration","outputs":[{"internalType":"uint256","name":"pauseWindowDuration","type":"uint256"},{"internalType":"uint256","name":"bufferPeriodDuration","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getPoolVersion","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getProtocolFeePercentagesProvider","outputs":[{"internalType":"contract IProtocolFeePercentagesProvider","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getVault","outputs":[{"internalType":"contract IVault","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"isDisabled","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"pool","type":"address"}],"name":"isPoolFromFactory","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"version","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"}]';

  const factoryContract = new ethers.Contract(factoryAddress, abi, wallet);

  const pool = await factoryContract.create(
    name,
    symbol,
    tokenAddresses,
    amplificationParameter,
    rateProviders,
    tokenRateCacheDurations,
    exemptFromYieldProtocolFeeFlags,
    swapFee,
    owner
  );

  const version = await pool.getPoolVersion();

  console.log('ComposableStablePool version: ' + version);

  // try {
  //   const txReceipt = await tx.wait();

  //   console.log(
  //     'Transaction included in block number:' + txReceipt.blockNumber
  //   );
  // } catch (err: any) {
  //   // Slippage should trigger 507 error:
  //   // https://github.com/balancer-labs/balancer-v2-monorepo/blob/master/pkg/solidity-utils/contracts/helpers/BalancerErrors.sol#L218
  //   console.log(err.reason);
  //   console.log('TRANSACTION: ' + JSON.stringify(err.transaction));
  //   console.log('RECEIPT: ' + JSON.stringify(err.receipt));
  // }

  // const receipt: TransactionReceipt = await provider.getTransactionReceipt(
  //   tx.hash
  // );

  // const composableStableFactoryInterface = new Interface(
  //   composableStableFactoryAbi
  // );

  // const poolCreationEvent: LogDescription | null | undefined = receipt.logs
  //   .filter((log: Log) => {
  //     return isSameAddress(log.address, factoryAddress);
  //   })
  //   .map((log) => {
  //     return composableStableFactoryInterface.parseLog(log);
  //   })
  //   .find((parsedLog) => parsedLog?.name === 'PoolCreated');

  // if (!poolCreationEvent) return console.error("There's no event");
  // console.log('poolAddress: ' + poolCreationEvent.args.pool);
}

createComposableStablePool().then((r) => r);
