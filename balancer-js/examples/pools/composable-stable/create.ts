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
import { forkSetup } from "@/test/lib/utils";

dotenv.config();

const name = 'My-Test-Pool-Name';

const symbol = 'My-Test-Pool-Symbol';

const network = Network.GOERLI;
const rpcUrl = 'http://127.0.0.1:8000';
const alchemyRpcUrl = `${process.env.ALCHEMY_URL_GOERLI}`;
const blockNumber = 8200000;

const addresses = ADDRESSES[network];

const WETH_address = addresses.WETH.address;
const MAI_address = addresses.MAI.address;
const tokenAddresses = [MAI_address, WETH_address];

const amplificationParameter = '1';

const rateProviders = [
  '0x0000000000000000000000000000000000000000',
  '0x0000000000000000000000000000000000000000',
];

const tokenRateCacheDurations = ['0', '0'];

const exemptFromYieldProtocolFeeFlags = [false, false];

const swapFee = '0.01';
const owner = '0x817b6923f3cB53536859b1f01262d0E7f513dB78';
const factoryAddress = '0x85a80afee867adf27b50bdb7b76da70f1e853062';

async function createComposableStablePool() {
  // const rpcUrl = `https://mainnet.infura.io/v3/444153f7f8f2499db7be57a11b1f696e`;
  // const rpcUrl = 'https://goerli.gateway.tenderly.co/4Rzjgxiyt0WELoXRl1312Q'
  const provider: JsonRpcProvider = new ethers.providers.JsonRpcProvider(
    rpcUrl,
    network,
  );

  const signer = provider.getSigner();
  await forkSetup(signer, [], [], [], alchemyRpcUrl, blockNumber, false);

  const sdkConfig = {
    network,
    rpcUrl,
  };

  // await forkSetupLocalNode(signer);

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
      try {
        return composableStableFactoryInterface.parseLog(log);
      } catch (error) {
        console.error(error);
        return null;
      }
    })
    .find((parsedLog) => parsedLog?.name === 'PoolCreated');

  if (!poolCreationEvent) return console.error("There's no event");
  console.log("poolAddress: " + poolCreationEvent.args.pool);
}

createComposableStablePool().then((r) => r);
