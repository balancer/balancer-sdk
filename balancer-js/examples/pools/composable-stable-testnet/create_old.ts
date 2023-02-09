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

const network = Network.GOERLI;
const rpcUrl = `${process.env.ALCHEMY_URL_GOERLI}`;

const addresses = ADDRESSES[network];

const WETH_address = addresses.WETH.address;
const MAI_address = addresses.MAI.address;
const tokenAddresses = [MAI_address, WETH_address];

console.log(WETH_address);
console.log(MAI_address);

const amplificationParameter = '1';

const rateProviders = [
  '0x0000000000000000000000000000000000000000',
  '0x0000000000000000000000000000000000000000',
];

const tokenRateCacheDurations = ['0', '0'];

const exemptFromYieldProtocolFeeFlags = [false, false];

const swapFee = '0.01';
const owner = '0xfEB47392B746dA43C28683A145237aC5EC5D554B'; // Test Account
const factoryAddress = `${BALANCER_NETWORK_CONFIG[network].addresses.contracts.composableStablePoolFactory}`;

async function createComposableStablePool() {
  // const rpcUrl = `https://mainnet.infura.io/v3/444153f7f8f2499db7be57a11b1f696e`;
  // const rpcUrl = 'https://goerli.gateway.tenderly.co/4Rzjgxiyt0WELoXRl1312Q'
  const provider: JsonRpcProvider = new ethers.providers.JsonRpcProvider(
    rpcUrl,
    network
  );

  const wallet = new ethers.Wallet(`${process.env.TRADER_KEY}`, provider);

  const sdkConfig = {
    network,
    rpcUrl,
  };

  const balancer = new BalancerSDK(sdkConfig);
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

  console.log('ComposableStablePoolFactory address: ' + to);

  const signerAddress = await wallet.getAddress();

  const tx = await wallet.sendTransaction({
    from: signerAddress,
    to,
    data,
    gasLimit: 30000000, // 6721975,
  });

  console.log('tx sent with hash: ' + tx.hash);

  const txReceipt = await tx.wait();

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
}

createComposableStablePool().then((r) => r);
