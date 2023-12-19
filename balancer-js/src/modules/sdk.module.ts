import { ClaimService, IClaimService } from '@/modules/claims/ClaimService';
import { BalancerSdkConfig, BalancerNetworkConfig } from '@/types';
import { Swaps } from './swaps/swaps.module';
import { Relayer } from './relayer/relayer.module';
import { Subgraph } from './subgraph/subgraph.module';
import { Sor } from './sor/sor.module';
import { getNetworkConfig } from './sdk.helpers';
import { Pricing } from './pricing/pricing.module';
import { ContractInstances, Contracts } from './contracts/contracts.module';
import { Pools } from './pools';
import { Data } from './data';
import { VaultModel } from './vaultModel/vaultModel.module';
import { JsonRpcProvider } from '@ethersproject/providers';
import { Migrations } from './liquidity-managment/migrations';
import { Logger } from '@/lib/utils/logger';

export interface BalancerSDKRoot {
  config: BalancerSdkConfig;
  sor: Sor;
  subgraph: Subgraph;
  pools: Pools;
  data: Data;
  swaps: Swaps;
  relayer: Relayer;
  networkConfig: BalancerNetworkConfig;
  provider: JsonRpcProvider;
  claimService?: IClaimService;
}

export class BalancerSDK implements BalancerSDKRoot {
  readonly swaps: Swaps;
  readonly relayer: Relayer;
  readonly pricing: Pricing;
  readonly pools: Pools;
  readonly data: Data;
  balancerContracts: Contracts;
  vaultModel: VaultModel;
  readonly networkConfig: BalancerNetworkConfig;
  readonly provider: JsonRpcProvider;
  readonly claimService?: IClaimService;
  readonly migrationService?: Migrations;

  constructor(
    public config: BalancerSdkConfig,
    public sor = new Sor(config),
    public subgraph = new Subgraph(config)
  ) {
    const logger = Logger.getInstance();
    logger.setLoggingEnabled(!!config.enableLogging);
    this.networkConfig = getNetworkConfig(config);
    this.provider = sor.provider as JsonRpcProvider;

    this.balancerContracts = new Contracts(
      this.networkConfig.addresses.contracts,
      sor.provider
    );

    this.data = new Data(
      this.networkConfig,
      sor.provider,
      this.balancerContracts,
      config.subgraphQuery,
      config.coingecko
    );

    this.swaps = new Swaps(this.config);
    this.relayer = new Relayer();
    this.pricing = new Pricing(config, this.swaps);

    this.pools = new Pools(
      this.networkConfig,
      this.data,
      this.balancerContracts
    );

    if (this.data.liquidityGauges) {
      this.claimService = new ClaimService(
        this.data.liquidityGauges,
        this.data.feeDistributor,
        this.networkConfig.chainId,
        this.contracts.multicall,
        this.networkConfig.addresses.contracts.gaugeClaimHelper,
        this.networkConfig.addresses.contracts.balancerMinter
      );
      this.migrationService = new Migrations({
        relayerAddress: this.networkConfig.addresses.contracts.balancerRelayer,
        poolsRepository: this.data.pools,
        gaugesRepository: this.data.liquidityGauges.subgraph,
        provider: this.provider,
      });
    }
    this.vaultModel = new VaultModel(
      this.data.poolsForSimulations,
      this.networkConfig.addresses.tokens.wrappedNativeAsset
    );
  }

  /**
   * Expose balancer contracts, e.g. Vault, LidoRelayer.
   */
  get contracts(): ContractInstances {
    return this.balancerContracts.contracts;
  }
}
