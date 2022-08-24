import { BalancerSdkConfig } from '@/types';
import { Stable } from './pool-types/stable.module';
import { Weighted } from './pool-types/weighted.module';
import { MetaStable } from './pool-types/metaStable.module';
import { StablePhantom } from './pool-types/stablePhantom.module';
import { Linear } from './pool-types/linear.module';
import { BalancerError, BalancerErrorCode } from '@/balancerErrors';
import { ethers } from 'ethers';
import { WeightedPoolFactory__factory } from '@balancer-labs/typechain';
import { SubgraphPoolBase } from '@balancer-labs/sor';

export class Pools {
  config: BalancerSdkConfig;
  public weighted: Weighted;
  public stable: Stable;
  public metaStable: MetaStable;
  public stablePhantom: StablePhantom;
  public linear: Linear;
  static config: BalancerSdkConfig;

  constructor(config: BalancerSdkConfig) {
    this.config = config;
    this.weighted = new Weighted(this.config);
    this.stable = new Stable();
    this.metaStable = new MetaStable();
    this.stablePhantom = new StablePhantom();
    this.linear = new Linear();
  }

  from(
    pool: SubgraphPoolBase
  ): Weighted | Stable | MetaStable | StablePhantom | Linear {
    // Calculate spot price using pool type
    switch (pool.poolType) {
      case 'Weighted': {
        return new Weighted(this.config);
      }
      case 'Investment':
      case 'LiquidityBootstrapping':
      case 'Stable': {
        return new Stable();
      }
      case 'MetaStable': {
        return new MetaStable();
      }
      case 'StablePhantom': {
        return new StablePhantom();
      }
      case 'AaveLinear':
      case 'ERC4626Linear': {
        return new Linear();
      }
      default:
        throw new BalancerError(BalancerErrorCode.UNSUPPORTED_POOL_TYPE);
    }
  }

  async getPoolInfoFromCreateTx(
    tx: ethers.ContractReceipt,
    provider: ethers.providers.JsonRpcProvider
  ): Promise<{ address: string }> {
    const wPoolFactory = WeightedPoolFactory__factory.createInterface();
    const filterTopics = wPoolFactory.encodeFilterTopics(
      wPoolFactory.events['PoolCreated(address)'],
      []
    ) as string[];
    const event = await provider.getLogs({
      blockHash: tx.blockHash,
      topics: filterTopics,
    });
    const filtered = event.filter((a) =>
      a.topics.includes(
        Array.isArray(filterTopics[0]) ? filterTopics[0][0] : filterTopics[0]
      )
    );

    const eventData = filtered[0].topics[1] || '';
    const poolAddress = ethers.utils.defaultAbiCoder.decode(
      ['address'],
      eventData
    )[0];

    return { address: poolAddress };
  }
}
