import { Findable, Pool, PoolAttribute } from '@/types';
import { JsonRpcProvider } from '@ethersproject/providers';
import { SubgraphLiquidityGauge } from '../subgraph/subgraph';
import { migrationBuilder } from './migrations/builder';
import {
  balancerRelayerInterface,
  buildMigrationPool,
  getMinBptOut,
} from './migrations/helpers';
import * as actions from '@/modules/relayer/actions';

/**
 * Class responsible for building liquidity migration transactions.
 */
export class Migrations {
  /**
   * Instance of a class responsible for building liquidity migration transactions.
   *
   * @param relayerAddress Address of the relayer contract.
   * @param poolsRepository Repository of pools.
   * @param liquidityGaugesRepository Repository of liquidity gauges.
   * @param provider Provider to use for RPC data fetching.
   *
   * Available methods:
   * - `pool2pool` - Migrates liquidity from one pool to another.
   * - `pool2poolWithGauges` - Migrates liquidity from a pool's gauge to another gauge.
   * - `gauge2gauge` - Migrates liquidity from one gauge to another of the same pool.
   *
   * @example
   * ```typescript
   * const sdk = new BalancerSDK({
   *   network: 1,
   *   rpcUrl: 'https://rpc.ankr.com/eth',
   * })
   *
   * const migrations = new Migrations(
   *   sdk.networkConfig.addresses.contracts.relayerV4 as string,
   *   sdk.data.pools,
   *   sdk.data.liquidityGauges.subgraph,
   *   sdk.provider
   * )
   *
   * const user = '0xfacec29Ae158B26e234B1a81Db2431F6Bd8F8cE8'
   * const from = '0x32296969ef14eb0c6d29669c550d4a0449130230000200000000000000000080'
   * const to = '0x32296969ef14eb0c6d29669c550d4a0449130230000200000000000000000080'
   * const balance = '1000000000000000000'
   * const { to, data } = await migrations.pool2pool(user, from, to, balance)
   *
   * const tx = await sdk.provider.sendTransaction({ to, data })
   * ```
   */
  constructor(
    public relayerAddress: string,
    public poolsRepository: Findable<Pool, PoolAttribute>,
    public gaugesRepository: Findable<SubgraphLiquidityGauge>,
    public provider: JsonRpcProvider
  ) {}

  /**
   * Takes user, from and to pool IDs as strings and returns the transaction data
   *
   * @param user - user address
   * @param from - pool ID
   * @param to - pool ID
   * @param balance - amount of liquidity to migrate in WAL (wei-ether)
   * @param minBptOut - minimum amount of BPT to receive, when 0 it will include a peek for the amount
   * @returns transaction data
   */
  async pool2pool(
    user: string,
    from: string,
    to: string,
    balance: string,
    minBptOut = '0'
  ): Promise<{ to: string; data: string }> {
    const fromPool = await buildMigrationPool(from, this.poolsRepository);
    const toPool = await buildMigrationPool(to, this.poolsRepository);

    const data = migrationBuilder(
      user,
      this.relayerAddress,
      String(balance),
      minBptOut,
      fromPool,
      toPool,
      minBptOut == '0' // if minBptOut is 0, we peek for the join amount
    );

    return {
      to: this.relayerAddress,
      data,
    };
  }

  /**
   * Takes user, from and to pool IDs as strings and returns the transaction data
   * for a migration including unstaking and restaking
   *
   * @param user - user address
   * @param from - pool ID
   * @param to - pool ID
   * @param balance - amount of liquidity to migrate in WAL (wei-ether)
   * @returns transaction data
   */
  async pool2poolWithGauges(
    user: string,
    from: string,
    to: string,
    balance: string,
    minBptOut = '0'
  ): Promise<{ to: string; data: string }> {
    const fromGauge = await this.gaugesRepository.findBy('poolId', from);
    const toGauge = await this.gaugesRepository.findBy('poolId', to);
    if (!fromGauge || !fromGauge.poolId || !toGauge || !toGauge.poolId) {
      throw new Error('Gauge not found');
    }
    const fromPool = await buildMigrationPool(
      fromGauge.poolId,
      this.poolsRepository
    );
    const toPool = await buildMigrationPool(
      toGauge.poolId,
      this.poolsRepository
    );

    const data = migrationBuilder(
      user,
      this.relayerAddress,
      String(balance),
      minBptOut,
      fromPool,
      toPool,
      minBptOut == '0', // if minBptOut is 0, we peek for the join amount
      fromGauge.id,
      toGauge.id
    );

    return {
      to: this.relayerAddress,
      data,
    };
  }

  /**
   * Migrates staked liquidity for the same pool from one gauge to another.
   *
   * @param user - user address
   * @param from - gauge address
   * @param to - gauge address
   * @param balance - amount of liquidity to migrate in WAL (wei-ether)
   * @returns transaction data
   */
  async gauge2gauge(
    user: string,
    from: string,
    to: string,
    balance: string
  ): Promise<{ to: string; data: string }> {
    const steps = [
      actions.gaugeWithdrawal(from, user, this.relayerAddress, balance),
      actions.gaugeDeposit(to, this.relayerAddress, user, balance),
    ];

    const data = balancerRelayerInterface.encodeFunctionData('multicall', [
      steps,
    ]);

    return {
      to: this.relayerAddress,
      data,
    };
  }

  static getMinBptOut = getMinBptOut;
  getMinBptOut = getMinBptOut;
}
