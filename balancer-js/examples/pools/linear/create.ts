/*
  Linear - Create. (Linear Pools doesn't need to be initialized)
  Run command: yarn examples:run ./examples/pools/linear/create.ts
 */
import { parseFixed } from '@ethersproject/bignumber';
import * as dotenv from 'dotenv';

import { ProtocolId } from '@/modules/pools/factory/types';
import { ADDRESSES } from '@/test/lib/constants';
import { BalancerSDK, Network, PoolType } from 'src';
import { setUpExample } from '../helper';

dotenv.config();

async function createLinearPool() {
  const { ALCHEMY_URL: rpcUrlArchive } = process.env;
  const network = Network.MAINNET;
  const rpcUrlLocal = 'http://127.0.0.1:8545';
  const sdkConfig = {
    network,
    rpcUrl: rpcUrlLocal,
  };
  const balancer = new BalancerSDK(sdkConfig);
  const addresses = ADDRESSES[network];
  const poolTokens = [addresses.DAI.address, addresses.eDAI.address];
  const { signer } = await setUpExample(
    rpcUrlArchive as string,
    rpcUrlLocal,
    network,
    [],
    [],
    [],
    '',
    16720000
  );
  const ownerAddress = await signer.getAddress();
  const poolType = PoolType.EulerLinear;
  const poolParameters = {
    name: 'My-Test-Pool-Name',
    symbol: 'My-Test-Pool-Symbol',
    mainToken: poolTokens[0],
    wrappedToken: poolTokens[1],
    upperTarget: '20000',
    owner: ownerAddress,
    protocolId: ProtocolId.EULER,
    swapFeeEvm: parseFixed('0.01', 18).toString(),
  };
  // Build the create transaction
  const linearPoolFactory = balancer.pools.poolFactory.of(poolType);
  const { to, data } = linearPoolFactory.create(poolParameters);

  //Sends the create transaction
  const createTransaction = await signer.sendTransaction({
    to,
    data,
    gasLimit: 30000000,
  });
  const createTransactionReceipt = await createTransaction.wait();

  // Check logs of creation receipt to get new pool ID and address
  const { poolAddress, poolId } =
    await linearPoolFactory.getPoolAddressAndIdWithReceipt(
      signer.provider,
      createTransactionReceipt
    );
  console.log('poolId: ' + poolId);
  console.log('poolAddress: ' + poolAddress);
  console.log(
    "Note: Linear pools doesn't need to initialize, user can join them through swaps right after creation"
  );
}

createLinearPool().then((r) => r);
