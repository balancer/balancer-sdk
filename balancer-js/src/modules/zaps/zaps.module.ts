import { BigNumberish, BigNumber } from '@ethersproject/bignumber';
import { Interface } from '@ethersproject/abi';
import { MaxUint256, WeiPerEther, Zero } from '@ethersproject/constants';
import { BalancerError, BalancerErrorCode } from '@/balancerErrors';
import { BalancerSdkConfig } from '@/types';
import { Network } from '@/lib/constants/network';
import { MigrateStaBal3, MigrationAttributes } from './migrateStaBal3';
import { Relayer } from '../relayer/relayer.module';

/**
TO DOS

Update typechain Relayer and use this.
 */

export class Zaps {
  constructor(public network: Network, public relayer: Relayer) {}

  migrateStaBal3(migrator: string, amount: string): MigrationAttributes {
    const migrate = new MigrateStaBal3(this.network, this.relayer);
    return migrate.buildMigration(migrator, amount);
  }
}
