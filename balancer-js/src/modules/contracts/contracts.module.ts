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
import { Multicall } from './implementations/multicall';
import { ERC20 } from './implementations/ERC20';
import { VeBal } from './implementations/veBAL';
import { VeBalProxy } from './implementations/veBAL-proxy';

type ERC20Helper = (address: string, provider: Provider) => Contract;
export interface ContractInstances {
  vault: Vault;
  lidoRelayer?: LidoRelayer;
  multicall: Contract;
  ERC20: ERC20Helper;
  veBal?: VeBal;
  veBalProxy?: VeBalProxy;
}

export class Contracts {
  contractAddresses: ContractAddresses;
  vault: Vault;
  lidoRelayer?: LidoRelayer;
  multicall: Contract;
  veBal?: VeBal;
  veBalProxy?: VeBalProxy;

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

    if (this.contractAddresses.veBal) {
      this.veBal = new VeBal(this.contractAddresses, provider);
    }

    if (this.contractAddresses.veBalProxy) {
      this.veBalProxy = new VeBalProxy(this.contractAddresses, provider);
    }
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
      veBal: this.veBal,
      veBalProxy: this.veBalProxy,
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
