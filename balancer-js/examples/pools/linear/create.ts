/*
  Linear - Create. (Linear Pools are initialized upon creation and can be immediately after creation joined using swaps)
  Run command: yarn examples:run ./examples/pools/linear/create.ts
 */
import * as dotenv from 'dotenv';
dotenv.config();
import { parseFixed } from '@ethersproject/bignumber';
import { ADDRESSES } from '@/test/lib/constants';
import { setUpExample } from '../helper';

import {
  BalancerSDK,
  LinearCreatePoolParameters,
  Network,
  PoolType,
  ProtocolId,
} from '@/.';

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
  const poolTokens = [addresses.DAI.address, addresses.sAPE.address];
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
  const poolParameters: LinearCreatePoolParameters = {
    name: 'My-Test-Pool-Name',
    symbol: 'My-Test-Pool-Symbol',
    mainToken: poolTokens[0],
    wrappedToken: poolTokens[1],
    upperTargetEvm: parseFixed('20000', 18).toString(),
    owner: ownerAddress,
    protocolId: ProtocolId.TESSERA,
    swapFeeEvm: parseFixed('0.01', 18).toString(),
  };
  // Build the create transaction
  const linearPoolFactory = balancer.pools.poolFactory.of(
    PoolType.ERC4626Linear
  );
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
