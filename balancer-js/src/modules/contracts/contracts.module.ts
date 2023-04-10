import { Contract } from '@ethersproject/contracts';
import { Provider } from '@ethersproject/providers';
import { Signer } from '@ethersproject/abstract-signer';

import { Multicall } from './implementations/multicall';
import { BasePool } from './implementations/base-pool';
import { VeBal } from './implementations/veBAL';
import { VeBalProxy } from './implementations/veBAL-proxy';
import {
  AaveLinearPoolFactory,
  AaveLinearPoolFactory__factory,
  BalancerHelpers,
  BalancerHelpers__factory,
  ComposableStablePoolFactory,
  ComposableStablePoolFactory__factory,
  ERC20,
  ERC20__factory,
  ERC4626LinearPoolFactory,
  ERC4626LinearPoolFactory__factory,
  EulerLinearPoolFactory,
  EulerLinearPoolFactory__factory,
  GaugeClaimHelper,
  GaugeClaimHelper__factory,
  GearboxLinearPoolFactory,
  GearboxLinearPoolFactory__factory,
  LidoRelayer,
  LidoRelayer__factory,
  LiquidityGaugeV5,
  LiquidityGaugeV5__factory,
  RelayerV3,
  RelayerV3__factory,
  RelayerV4,
  RelayerV4__factory,
  RelayerV5,
  RelayerV5__factory,
  Vault,
  Vault__factory,
  WeightedPoolFactory,
  WeightedPoolFactory__factory,
  YearnLinearPoolFactory,
  YearnLinearPoolFactory__factory,
} from '@/contracts';
import { Network } from '@/lib/constants/network';
import { BALANCER_NETWORK_CONFIG } from '@/lib/constants/config';
import { ContractAddresses } from '@/types';

type ContractFactory = (
  address: string,
  signerOrProvider: Signer | Provider
) => Contract;

export interface ContractInstances {
  aaveLinearPoolFactory?: AaveLinearPoolFactory;
  balancerHelpers: BalancerHelpers;
  BasePool: ContractFactory;
  composableStablePoolFactory?: ComposableStablePoolFactory;
  ERC20: ContractFactory;
  erc4626LinearPoolFactory?: ERC4626LinearPoolFactory;
  eulerLinearPoolFactory?: EulerLinearPoolFactory;
  gaugeClaimHelper?: GaugeClaimHelper;
  gearboxLinearPoolFactory?: GearboxLinearPoolFactory;
  lidoRelayer?: LidoRelayer;
  liquidityGauge: ContractFactory;
  multicall: Contract;
  relayerV3?: RelayerV3;
  relayerV4?: RelayerV4;
  relayerV5?: RelayerV5;
  vault: Vault;
  veBal?: VeBal;
  veBalProxy?: VeBalProxy;
  weightedPoolFactory?: WeightedPoolFactory;
  yearnLinearPoolFactory?: YearnLinearPoolFactory;
}

export class Contracts {
  aaveLinearPoolFactory?: ContractInstances['aaveLinearPoolFactory'];
  balancerHelpers: ContractInstances['balancerHelpers'];
  composableStablePoolFactory?: ContractInstances['composableStablePoolFactory'];
  contractAddresses: ContractAddresses;
  erc4626LinearPoolFactory?: ContractInstances['erc4626LinearPoolFactory'];
  eulerLinearPoolFactory?: ContractInstances['eulerLinearPoolFactory'];
  gaugeClaimHelper?: ContractInstances['gaugeClaimHelper'];
  gearboxLinearPoolFactory?: ContractInstances['gearboxLinearPoolFactory'];
  lidoRelayer?: ContractInstances['lidoRelayer'];
  multicall: Contract;
  relayerV3?: ContractInstances['relayerV3'];
  relayerV4?: ContractInstances['relayerV4'];
  relayerV5?: ContractInstances['relayerV5'];
  vault: ContractInstances['vault'];
  veBal?: ContractInstances['veBal'];
  veBalProxy?: ContractInstances['veBalProxy'];
  weightedPoolFactory?: ContractInstances['weightedPoolFactory'];
  yearnLinearPoolFactory?: ContractInstances['yearnLinearPoolFactory'];

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
    this.balancerHelpers = BalancerHelpers__factory.connect(
      this.contractAddresses.balancerHelpers,
      provider
    );

    if (this.contractAddresses.lidoRelayer)
      this.lidoRelayer = LidoRelayer__factory.connect(
        this.contractAddresses.lidoRelayer,
        provider
      );

    // TO DO - Possibly create via Typechain but seems unnecessary?
    this.multicall = Multicall(this.contractAddresses.multicall, provider);
    if (this.contractAddresses.relayerV3)
      this.relayerV3 = RelayerV3__factory.connect(
        this.contractAddresses.relayerV3,
        provider
      );
    if (this.contractAddresses.relayerV4)
      this.relayerV4 = RelayerV4__factory.connect(
        this.contractAddresses.relayerV4,
        provider
      );
    if (this.contractAddresses.relayerV5)
      this.relayerV5 = RelayerV5__factory.connect(
        this.contractAddresses.relayerV5,
        provider
      );

    if (this.contractAddresses.veBal) {
      this.veBal = new VeBal(this.contractAddresses, provider);
    }

    if (this.contractAddresses.veBalProxy) {
      this.veBalProxy = new VeBalProxy(this.contractAddresses, provider);
    }

    if (this.contractAddresses.gaugeClaimHelper)
      this.gaugeClaimHelper = GaugeClaimHelper__factory.connect(
        this.contractAddresses.gaugeClaimHelper,
        provider
      );
    if (this.contractAddresses.composableStablePoolFactory) {
      this.composableStablePoolFactory =
        ComposableStablePoolFactory__factory.connect(
          this.contractAddresses.composableStablePoolFactory,
          provider
        );
    }
    if (this.contractAddresses.weightedPoolFactory) {
      this.weightedPoolFactory = WeightedPoolFactory__factory.connect(
        this.contractAddresses.weightedPoolFactory,
        provider
      );
    }
    if (this.contractAddresses.aaveLinearPoolFactory) {
      this.aaveLinearPoolFactory = AaveLinearPoolFactory__factory.connect(
        this.contractAddresses.aaveLinearPoolFactory,
        provider
      );
    }
    if (this.contractAddresses.erc4626LinearPoolFactory) {
      this.erc4626LinearPoolFactory = ERC4626LinearPoolFactory__factory.connect(
        this.contractAddresses.erc4626LinearPoolFactory,
        provider
      );
    }
    if (this.contractAddresses.eulerLinearPoolFactory) {
      this.eulerLinearPoolFactory = EulerLinearPoolFactory__factory.connect(
        this.contractAddresses.eulerLinearPoolFactory,
        provider
      );
    }
    if (this.contractAddresses.gearboxLinearPoolFactory) {
      this.gearboxLinearPoolFactory = GearboxLinearPoolFactory__factory.connect(
        this.contractAddresses.gearboxLinearPoolFactory,
        provider
      );
    }
    if (this.contractAddresses.yearnLinearPoolFactory) {
      this.yearnLinearPoolFactory = YearnLinearPoolFactory__factory.connect(
        this.contractAddresses.yearnLinearPoolFactory,
        provider
      );
    }
  }

  /**
   * Expose contract instances.
   */
  get contracts(): ContractInstances {
    return {
      aaveLinearPoolFactory: this.aaveLinearPoolFactory,
      balancerHelpers: this.balancerHelpers,
      BasePool: this.getBasePool,
      composableStablePoolFactory: this.composableStablePoolFactory,
      ERC20: this.getErc20,
      erc4626LinearPoolFactory: this.erc4626LinearPoolFactory,
      eulerLinearPoolFactory: this.eulerLinearPoolFactory,
      gaugeClaimHelper: this.gaugeClaimHelper,
      gearboxLinearPoolFactory: this.gearboxLinearPoolFactory,
      liquidityGauge: this.getLiquidityGauge,
      lidoRelayer: this.lidoRelayer,
      multicall: this.multicall,
      relayerV3: this.relayerV3,
      relayerV4: this.relayerV4,
      vault: this.vault,
      veBal: this.veBal,
      veBalProxy: this.veBalProxy,
      weightedPoolFactory: this.weightedPoolFactory,
      yearnLinearPoolFactory: this.yearnLinearPoolFactory,
    };
  }

  /**
   * Helper to create ERC20 contract.
   * @param { string } address ERC20 address.
   * @param { Signer | Provider } signerOrProvider Signer or Provider.
   * @returns Contract.
   */
  getErc20(address: string, signerOrProvider: Signer | Provider): ERC20 {
    return ERC20__factory.connect(address, signerOrProvider);
  }

  /**
   * Helper to create base pool contract.
   * @param { string } address pool address.
   * @param { Signer | Provider } signerOrProvider Signer or Provider.
   * @returns Contract.
   */
  getBasePool(address: string, signerOrProvider: Signer | Provider): Contract {
    return BasePool(address, signerOrProvider);
  }

  /**
   * Helper to create LiquidityGauge contract.
   * @param { string } address Gauge address.
   * @param { Signer | Provider} signerOrProvider Signer or Provider.
   * @returns Contract.
   */
  getLiquidityGauge(
    address: string,
    signerOrProvider: Signer | Provider
  ): LiquidityGaugeV5 {
    return LiquidityGaugeV5__factory.connect(address, signerOrProvider);
  }
}
