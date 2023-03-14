import * as dotenv from 'dotenv';
import { JsonRpcProvider } from '@ethersproject/providers';
import { BalancerSDK, Network, PoolType } from 'src';
import { ethers } from 'hardhat';
import { LogDescription } from '@ethersproject/abi';
import { ADDRESSES } from '@/test/lib/constants';
import {
  findEventInReceiptLogs,
  forkSetup,
  sendTransactionGetBalances,
} from '@/test/lib/utils';
import { BALANCER_NETWORK_CONFIG } from '@/lib/constants/config';
import { parseFixed } from '@ethersproject/bignumber';
import { ProtocolId } from '@/modules/pools/factory/types';
import { ERC4626LinearPoolFactory__factory } from '@/contracts';

dotenv.config();

const network = Network.MAINNET;
const alchemyRpcUrl = `${process.env.ALCHEMY_URL}`;
const blockNumber = 16720000;
const rpcUrl = 'http://127.0.0.1:8545';
export const provider: JsonRpcProvider = new ethers.providers.JsonRpcProvider(
  rpcUrl,
  network
);
export const signer = provider.getSigner();
const sdkConfig = {
  network,
  rpcUrl,
};
export const balancer = new BalancerSDK(sdkConfig);

const { APE, sAPE } = ADDRESSES[network];
const tokens = [APE.address, sAPE.address];
const balances = [
  parseFixed('1000000000', APE.decimals).toString(),
  parseFixed('1000000000', sAPE.decimals).toString(),
];

const linearPoolCreateParams = {
  factoryAddress: `${BALANCER_NETWORK_CONFIG[network].addresses.contracts.erc4626LinearPoolFactory}`,
  name: 'My-Test-Pool-Name',
  symbol: 'My-Test-Pool-Symbol',
  mainToken: APE.address,
  wrappedToken: sAPE.address,
  upperTarget: '20000',
  owner: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
  protocolId: ProtocolId.EULER,
  swapFee: '0.01',
};

async function createLinearPool() {
  await forkSetup(
    signer,
    tokens,
    undefined,
    balances,
    alchemyRpcUrl,
    blockNumber,
    false
  );
  const linearPoolFactory = balancer.pools.poolFactory.of(
    PoolType.ERC4626Linear
  );
  const { to, data } = linearPoolFactory.create(linearPoolCreateParams);

  const signerAddress = await signer.getAddress();

  const { transactionReceipt } = await sendTransactionGetBalances(
    [],
    signer,
    signerAddress,
    to as string,
    data as string
  );

  const linearPoolFactoryInterface =
    ERC4626LinearPoolFactory__factory.createInterface();

  const poolCreationEvent: LogDescription = findEventInReceiptLogs({
    receipt: transactionReceipt,
    to: to as string,
    contractInterface: linearPoolFactoryInterface,
    logName: 'PoolCreated',
  });
  console.log('poolAddress: ' + poolCreationEvent.args.pool);
  return poolCreationEvent.args.pool;
}

export default createLinearPool();
