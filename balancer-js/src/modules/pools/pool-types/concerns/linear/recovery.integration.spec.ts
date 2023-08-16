// yarn test:only ./src/modules/pools/pool-types/concerns/linear/recovery.integration.spec.ts
import dotenv from 'dotenv';
import { ethers } from 'hardhat';
import { parseFixed } from '@ethersproject/bignumber';
import {
  BalancerSDK,
  getPoolAddress,
  Network,
  PoolWithMethods,
  GraphQLArgs,
  GraphQLQuery,
  ERC4626LinearPool__factory,
  Authoriser__factory,
} from '@/.';
import { forkSetup } from '@/test/lib/utils';
import { testRecoveryExit } from '@/test/lib/exitHelper';

dotenv.config();

const network = Network.MAINNET;
const { ALCHEMY_URL: jsonRpcUrl } = process.env;
const rpcUrl = 'http://127.0.0.1:8545';
const provider = new ethers.providers.JsonRpcProvider(rpcUrl, network);
const blockNumber = 17920684;
const signer = provider.getSigner();

describe('Linear - recovery exits', () => {
  context('buildRecoveryExit', async () => {
    it('ERC4626 - should recovery exit', async () => {
      const poolId =
        '0xcbfa4532d8b2ade2c261d3dd5ef2a2284f7926920000000000000000000004fa';
      // Setup forked network, set initial token balances and allowances
      await forkSetup(
        signer,
        [getPoolAddress(poolId)],
        [0],
        [parseFixed('1000000', 18).toString()],
        jsonRpcUrl as string,
        blockNumber
      );
      const pool = await getPool(poolId, blockNumber);
      // enableRecoveryMode() role (see deployments repo for confirmation)
      const actionId =
        '0x650376aebfe02b35334f3ae96d46b9e5659baa84220d58312d9d2e2920ec9f1d';
      await setRecovery(pool.address, actionId);
      const bptIn = parseFixed('1000000', 18).toString();
      await testRecoveryExit(pool, signer, bptIn);
    });
    it.skip('AaveLinear V1 - should recovery exit', async () => {
      // These don't seem to have recovery exit?
      const poolId =
        '0x2bbf681cc4eb09218bee85ea2a5d3d13fa40fc0c0000000000000000000000fd';
      // Setup forked network, set initial token balances and allowances
      await forkSetup(
        signer,
        [getPoolAddress(poolId)],
        [0],
        [parseFixed('123', 18).toString()],
        jsonRpcUrl as string,
        blockNumber
      );
      const pool = await getPool(poolId, blockNumber);
      const actionId =
        '0x650376aebfe02b35334f3ae96d46b9e5659baa84220d58312d9d2e2920ec9f1d';
      await setRecovery(pool.address, actionId);
      const bptIn = parseFixed('123', 18).toString();
      await testRecoveryExit(pool, signer, bptIn);
    });
    it('AaveLinear V2 - should recovery exit', async () => {
      const poolId =
        '0x2f4eb100552ef93840d5adc30560e5513dfffacb000000000000000000000334';
      // Setup forked network, set initial token balances and allowances
      await forkSetup(
        signer,
        [getPoolAddress(poolId)],
        [0],
        [parseFixed('1234', 18).toString()],
        jsonRpcUrl as string,
        blockNumber
      );
      const pool = await getPool(poolId, blockNumber);
      const actionId =
        '0xd6a9f64d81e7c22127c3fb002e0a42508528898232c353fc3d33cd259ea1de7b';
      await setRecovery(pool.address, actionId);
      const bptIn = parseFixed('1234', 18).toString();
      await testRecoveryExit(pool, signer, bptIn);
    });
    it('GearBoxLinear - should recovery exit', async () => {
      // 0x54a844ba
      const poolId =
        '0x4a82b580365cff9b146281ab72500957a849abdc000000000000000000000494';
      // Setup forked network, set initial token balances and allowances
      await forkSetup(
        signer,
        [getPoolAddress(poolId)],
        [0],
        [parseFixed('123423', 18).toString()],
        jsonRpcUrl as string,
        blockNumber
      );
      const pool = await getPool(poolId, blockNumber);
      const actionId =
        '0xa32a74d0340eda2bd1a7c5ec04d47e7a95f472e66d159ecf6e21d957a5a003a9';
      await setRecovery(pool.address, actionId);
      const bptIn = parseFixed('123423', 18).toString();
      await testRecoveryExit(pool, signer, bptIn);
    });
  });
});

async function getPool(
  poolId: string,
  blockNumber: number
): Promise<PoolWithMethods> {
  const subgraphArgs: GraphQLArgs = {
    where: {
      id: {
        in: [poolId],
      },
    },
    block: { number: blockNumber },
  };

  const subgraphQuery: GraphQLQuery = { args: subgraphArgs, attrs: {} };
  const balancer = new BalancerSDK({
    network,
    rpcUrl,
    subgraphQuery,
  });

  const pool = await balancer.pools.find(poolId);
  if (!pool) throw Error('Pool not found');
  return pool;
}

async function setRecovery(poolAddr: string, role: string) {
  // Governance has permissions to set roles on pools
  const governanceSafeAddr = '0x10A19e7eE7d7F8a52822f6817de8ea18204F2e4f';
  // Authoriser contract is used to set the roles
  const authoriserAddr = '0xA331D84eC860Bf466b4CdCcFb4aC09a1B43F3aE6';
  await provider.send('hardhat_impersonateAccount', [governanceSafeAddr]);
  const signerGovernance = provider.getSigner(governanceSafeAddr);
  const authoriser = Authoriser__factory.connect(
    authoriserAddr,
    signerGovernance
  );

  // Grant governance permission to set pools into recovery
  let tx = await authoriser.grantRole(role, governanceSafeAddr);
  await tx.wait();
  const poolContract = ERC4626LinearPool__factory.connect(
    poolAddr,
    signerGovernance
  );
  // Set pool into recovery
  tx = await poolContract.enableRecoveryMode();
  await tx.wait();
  // const isRecovery = await poolContract.inRecoveryMode();
}
