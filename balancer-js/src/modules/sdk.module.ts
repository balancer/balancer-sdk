import {
  BalancerSdkConfig,
  BalancerNetworkConfig,
  BalancerDataRepositories,
} from '@/types';
// initialCoingeckoList are used to get the initial token list for coingecko
// TODO: we might want to replace that with what frontend is using
import { Swaps } from './swaps/swaps.module';
import { Relayer } from './relayer/relayer.module';
import { Subgraph } from './subgraph/subgraph.module';
import { Sor } from './sor/sor.module';
import { getDataRepositories, getNetworkConfig } from './sdk.helpers';
import { Pricing } from './pricing/pricing.module';
import { ContractInstances, Contracts } from './contracts/contracts.module';
import { Pools } from './pools';

export interface BalancerSDKRoot {
  config: BalancerSdkConfig;
  sor: Sor;
  subgraph: Subgraph;
  pools: Pools;
  swaps: Swaps;
  relayer: Relayer;
  networkConfig: BalancerNetworkConfig;
}

export class BalancerSDK implements BalancerSDKRoot {
  readonly swaps: Swaps;
  readonly relayer: Relayer;
  readonly pricing: Pricing;
  readonly pools: Pools;
  balancerContracts: Contracts;

  constructor(
    public config: BalancerSdkConfig,
    public sor = new Sor(config),
    public subgraph = new Subgraph(config)
  ) {
    const networkConfig = getNetworkConfig(config);
    const repositories = getDataRepositories(config);

    this.swaps = new Swaps(this.config);
    this.relayer = new Relayer(this.swaps);
    this.pricing = new Pricing(config, this.swaps);
    this.pools = new Pools(networkConfig, repositories);

    this.balancerContracts = new Contracts(
      networkConfig.addresses.contracts,
      sor.provider
    );
  }

  get networkConfig(): BalancerNetworkConfig {
    return getNetworkConfig(this.config);
  }

  get dataRepositories(): BalancerDataRepositories {
    return getDataRepositories(this.config);
  }

  /**
   * Expose balancer contracts, e.g. Vault, LidoRelayer.
   */
  get contracts(): ContractInstances {
    return this.balancerContracts.contracts;
  }
}
