import { LogDescription } from '@ethersproject/abi';
import { parseFixed } from '@ethersproject/bignumber';
import {
  JsonRpcProvider,
  TransactionReceipt,
  TransactionResponse,
} from '@ethersproject/providers';
import * as dotenv from 'dotenv';
import { ethers } from 'hardhat';

import { ERC4626LinearPoolFactory__factory } from '@/contracts';
import { BALANCER_NETWORK_CONFIG } from '@/lib/constants/config';
import { ProtocolId } from '@/modules/pools/factory/types';
import { ADDRESSES } from '@/test/lib/constants';
import { findEventInReceiptLogs, forkSetup } from '@/test/lib/utils';
import { BalancerSDK, Network, PoolType } from 'src';

dotenv.config();

const network = Network.MAINNET;
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

const setupFork = async (): Promise<void> => {
  const alchemyRpcUrl = `${process.env.ALCHEMY_URL}`;
  const balances = [
    parseFixed('1000000000', APE.decimals).toString(),
    parseFixed('1000000000', sAPE.decimals).toString(),
  ];
  const blockNumber = 16720000;
  await forkSetup(
    signer,
    tokens,
    undefined,
    balances,
    alchemyRpcUrl,
    blockNumber,
    false
  );
};

const createLinearPool = async (): Promise<{
  transaction: TransactionResponse;
  to: string;
}> => {
  const linearPoolFactory = balancer.pools.poolFactory.of(
    PoolType.ERC4626Linear // Can be AaveLinear or EulerLinear
  );

  const { to, data } = linearPoolFactory.create(linearPoolCreateParams);

  const signerAddress = await signer.getAddress();
  const transaction = await signer.sendTransaction({
    from: signerAddress,
    to,
    data,
    gasLimit: 6721975,
  });
  return { transaction, to: to as string };
};

const checkIfPoolWasCreated = async ({
  transaction,
  to,
}: {
  transaction: TransactionResponse;
  to: string;
}): Promise<string> => {
  const receipt: TransactionReceipt = await provider.getTransactionReceipt(
    transaction.hash
  );
  const linearPoolFactoryInterface =
    ERC4626LinearPoolFactory__factory.createInterface();

  const poolCreationEvent: LogDescription = findEventInReceiptLogs({
    receipt,
    to,
    contractInterface: linearPoolFactoryInterface,
    logName: 'PoolCreated',
  });
  const poolAddress = poolCreationEvent.args.pool;
  return poolAddress;
};

async function createLinear() {
  await setupFork();
  const { transaction, to } = await createLinearPool();

  const poolAddress = await checkIfPoolWasCreated({ transaction, to });
  console.log('poolAddress: ' + poolAddress);
  console.log(
    "Note: Linear pools doesn't need to initialize, user can join them through swaps right after creation"
  );
}

createLinear().then((r) => r);
