import { Network } from '@/lib/constants/network';
import { MigrateStaBal3, MigrationAttributes } from './migrateStaBal3';
import { Relayer } from '../relayer/relayer.module';
import { JsonRpcProvider } from '@ethersproject/providers';
import { Pool } from '@/types';

/**
TO DOS

Update typechain Relayer and use this.
 */

export class Zaps {
  constructor(public network: Network, public relayer: Relayer) {}

  async queryMigrateStaBal3(
    staBal3: Pool,
    migrator: string,
    amount: string,
    provider: JsonRpcProvider
  ): Promise<string> {
    const migrate = new MigrateStaBal3(this.network, this.relayer, staBal3);
    return await migrate.queryMigration(migrator, amount, provider);
  }

  migrateStaBal3(
    staBal3: Pool,
    migrator: string,
    amount: string,
    expectedBptReturn: string,
    slippage: string
  ): MigrationAttributes {
    const migrate = new MigrateStaBal3(this.network, this.relayer, staBal3);
    return migrate.buildMigration(
      migrator,
      amount,
      expectedBptReturn,
      slippage
    );
  }
}
