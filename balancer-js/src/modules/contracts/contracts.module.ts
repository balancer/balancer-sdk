import { Contract } from '@ethersproject/contracts';
import { Provider } from '@ethersproject/providers';
import { BalancerSdkConfig, BalancerNetworkConfig } from '@/types';
import { BALANCER_NETWORK_CONFIG } from '@/lib/constants/config';
import {
  Vault__factory,
  Vault,
  LidoRelayer__factory,
  LidoRelayer,
} from '@balancer-labs/typechain';
import { Multicall } from './multicall';
import { ERC20 } from './ERC20';
export interface ContractInstances {
  vault: Vault;
  lidoRelayer: LidoRelayer | undefined;
  multicall: Contract;
  ERC20: Contract;
}

export class Contracts {
  networkConfig: BalancerNetworkConfig;
  vault: Vault;
  lidoRelayer: LidoRelayer | undefined;
  multicall: Contract;
  ERC20: Contract;

  /**
   * Create instances of Balancer contracts connected to passed provider.
   * @param { BalancerSdkConfig } config
   * @param { Provider } provider
   */
  constructor(config: BalancerSdkConfig, provider: Provider) {
    // Access addresses using passed network if available
    if (typeof config.network === 'number') {
      this.networkConfig = BALANCER_NETWORK_CONFIG[config.network];
    } else {
      this.networkConfig = config.network;
    }

    this.vault = Vault__factory.connect(
      this.networkConfig.addresses.contracts.vault,
      provider
    );

    if (this.networkConfig.addresses.contracts.lidoRelayer)
      this.lidoRelayer = LidoRelayer__factory.connect(
        this.networkConfig.addresses.contracts.lidoRelayer,
        provider
      );

    // These contracts aren't included in Balancer Typechain but are still useful.
    // TO DO - Possibly create via Typechain but seems unnecessary?
    this.multicall = Multicall(
      this.networkConfig.addresses.contracts.multicall,
      provider
    );

    this.ERC20 = ERC20(
      this.networkConfig.addresses.tokens.wrappedNativeAsset,
      provider
    );
  }

  /**
   * Expose contract instances.
   */
  get contracts(): ContractInstances {
    return {
      vault: this.vault,
      lidoRelayer: this.lidoRelayer,
      multicall: this.multicall,
      ERC20: this.ERC20,
    };
  }
}
