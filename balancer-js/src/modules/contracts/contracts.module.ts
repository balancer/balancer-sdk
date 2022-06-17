import { Contract } from '@ethersproject/contracts';
import { Provider } from '@ethersproject/providers';
import { ContractAddresses } from '@/types';
import { Network } from '@/lib/constants/network';
import { BALANCER_NETWORK_CONFIG } from '@/lib/constants/config';
import {
  Vault__factory,
  Vault,
  LidoRelayer__factory,
  LidoRelayer,
} from '@balancer-labs/typechain';
import { Multicall } from './multicall';
import { ERC20 } from './ERC20';

type ERC20Helper = (address: string, provider: Provider) => Contract;
export interface ContractInstances {
  vault: Vault;
  lidoRelayer?: LidoRelayer;
  multicall: Contract;
  ERC20: ERC20Helper;
}

export class Contracts {
  contractAddresses: ContractAddresses;
  vault: Vault;
  lidoRelayer?: LidoRelayer;
  multicall: Contract;

  /**
   * Create instances of Balancer contracts connected to passed provider.
   * @param { Network | ContractAddresses } networkOrAddresses
   * @param { Provider } provider
   */
  constructor(
    networkOrAddresses: Network | ContractAddresses,
    provider: Provider
  ) {
    // Access addresses using passed network if available
    if (typeof networkOrAddresses === 'number') {
      this.contractAddresses =
        BALANCER_NETWORK_CONFIG[networkOrAddresses].addresses.contracts;
    } else {
      this.contractAddresses = networkOrAddresses;
    }

    this.vault = Vault__factory.connect(this.contractAddresses.vault, provider);

    if (this.contractAddresses.lidoRelayer)
      this.lidoRelayer = LidoRelayer__factory.connect(
        this.contractAddresses.lidoRelayer,
        provider
      );

    // These contracts aren't included in Balancer Typechain but are still useful.
    // TO DO - Possibly create via Typechain but seems unnecessary?
    this.multicall = Multicall(this.contractAddresses.multicall, provider);
  }

  /**
   * Expose contract instances.
   */
  get contracts(): ContractInstances {
    return {
      vault: this.vault,
      lidoRelayer: this.lidoRelayer,
      multicall: this.multicall,
      ERC20: this.getErc20,
    };
  }

  /**
   * Helper to create ERC20 contract.
   * @param { string } address ERC20 address.
   * @param { Provider} provider Provider.
   * @returns Contract.
   */
  getErc20(address: string, provider: Provider): Contract {
    return ERC20(address, provider);
  }
}
