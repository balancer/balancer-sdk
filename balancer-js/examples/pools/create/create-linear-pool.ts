/**
 * Linear - Create. (Linear Pools are initialized upon creation and can be joined immediately after creation using swaps)
 *
 * Run command:
 * yarn example ./examples/pools/create/create-linear-pool.ts
 */
import {
  BalancerSDK,
  LinearCreatePoolParameters,
  Network,
  PoolType,
  ProtocolId,
} from '@balancer-labs/sdk';
import { parseEther } from '@ethersproject/units';

async function createLinearPool() {
  const balancer = new BalancerSDK({
    network: Network.MAINNET,
    rpcUrl: 'http://127.0.0.1:8545', // Using local fork for simulation
  });

  // Setup join parameters
  const signer = balancer.provider.getSigner();
  const ownerAddress = await signer.getAddress();
  const dai = '0x6b175474e89094c44da98b954eedeac495271d0f';
  const sape = '0x7966c5bae631294d7cffcea5430b78c2f76db6fa';
  const poolTokens = [dai, sape];

  const poolParameters: LinearCreatePoolParameters = {
    name: 'My-Test-Pool-Name',
    symbol: 'My-Test-Pool-Symbol',
    mainToken: poolTokens[0],
    wrappedToken: poolTokens[1],
    upperTargetEvm: parseEther('20000').toString(),
    owner: ownerAddress,
    protocolId: ProtocolId.TESSERA,
    swapFeeEvm: parseEther('0.01').toString(),
  };

  // Build the create transaction
  const linearPoolFactory = balancer.pools.poolFactory.of(
    PoolType.ERC4626Linear
  );

  const { to, data } = linearPoolFactory.create(poolParameters);

  // Sends the create transaction
  const receipt = await (
    await signer.sendTransaction({
      to,
      data,
    })
  ).wait();

  // Check logs of creation receipt to get new pool ID and address
  const { poolAddress, poolId } =
    await linearPoolFactory.getPoolAddressAndIdWithReceipt(
      signer.provider,
      receipt
    );
  console.log('poolId: ' + poolId);
  console.log('poolAddress: ' + poolAddress);
  console.log(
    "Note: Linear pools doesn't need to initialize, user can join them through swaps right after creation"
  );
}

createLinearPool().then((r) => r);
