import * as dotenv from 'dotenv';
import {
  JsonRpcProvider,
  Log,
  TransactionReceipt,
} from '@ethersproject/providers';
import {
  BalancerSDK,
  BalancerSdkConfig,
  Network,
  PoolType,
  PoolWithMethods,
} from '../src/index';
// @ts-ignore
import composableStableFactoryAbi from '../src/lib/abi/ComposableStableFactory.json';
// @ts-ignore
import { ethers } from 'hardhat';
import { Interface, LogDescription } from '@ethersproject/abi';

dotenv.config();

const name = 'My-Test-Pool-Name';

const symbol = 'My-Test-Pool-Symbol';

const tokenAddresses = [
  '0x0595D1Df64279ddB51F1bdC405Fe2D0b4Cc86681',
  '0x13ACD41C585d7EbB4a9460f7C8f50BE60DC080Cd',
];

const amplificationParameter = 1;

const rateProviders = [
  '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
  '0x1CBd3b2770909D4e10f157cABC84C7264073C9Ec',
];

const tokenRateCacheDurations = [20000, 20000];

const exemptFromYieldProtocolFeeFlags = [false, false];

const swapFee = 0.003;
const owner = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const contractAddress = '0xB848f50141F3D4255b37aC288C25C109104F2158';

// Slots used to set the account balance for each token through hardhat_setStorageAt
// Info fetched using npm package slot20

async function createComposableStablePool() {
  const network = Network.GOERLI;

  // const rpcUrl = `https://mainnet.infura.io/v3/${process.env.INFURA}`;
  const rpcUrl = 'http://localhost:8545';
  const provider: JsonRpcProvider = new ethers.providers.JsonRpcProvider(
    rpcUrl,
    1
  );
  const signer = provider.getSigner();

  const sdkConfig = {
    network,
    rpcUrl,
  };

  const balancer = new BalancerSDK(sdkConfig);

  const { to, data } = balancer.pools.poolFactory.of(PoolType.ComposableStable)
    .create({
      contractAddress,
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

  const tx = await signer.sendTransaction({
    from: signer.getAddress(),
    to,
    data,
    gasLimit: 6721975,
  });

  console.log('txHash: ' + tx.hash);
  console.log('from: ' + tx.from);
  console.log('contractAddress: ' + tx.to);

  const receipt: TransactionReceipt = await provider.getTransactionReceipt(
    tx.hash
  );
  console.log('receipt: ' + receipt);

  const composableStableFactoryInterface = new Interface(
    composableStableFactoryAbi
  );

  const poolCreationEvent: LogDescription | null | undefined = receipt.logs
    .filter((log: Log) => log.address === contractAddress)
    .map((log) => {
      try {
        return composableStableFactoryInterface.parseLog(log);
      } catch {
        return null;
      }
    })
    .find((parsedLog) => parsedLog?.name === 'PoolCreated');
  if (!poolCreationEvent) return console.error("There's no event");
  const poolAddress: string = poolCreationEvent.args.pool;

  const pool: PoolWithMethods = await balancer.pools.findBy(
    'address',
    poolAddress
  );

  console.log('Pool Id: ' + pool?.id);

  const {
    to: initJoinTo,
    data: initJoinData,
    attributes,
  } = pool.buildInitJoin(await signer.getAddress(), tokenAddresses, [
    '100',
    '100',
  ]);
  console.log('initJoin target address: ' + initJoinTo);
  console.log('initJoin data: ' + initJoinData);
  console.log('initJoin attributes: ' + attributes);
  
  
}

createComposableStablePool();
