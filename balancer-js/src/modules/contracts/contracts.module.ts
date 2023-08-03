import { Contract } from '@ethersproject/contracts';
import { Provider } from '@ethersproject/providers';
import { Signer } from '@ethersproject/abstract-signer';

import { BasePool } from './implementations/base-pool';
import { VeBal } from './implementations/veBAL';
import { VeBalProxy } from './implementations/veBAL-proxy';
import {
  AaveLinearPoolFactory,
  AaveLinearPoolFactory__factory,
  BalancerHelpers,
  BalancerHelpers__factory,
  BalancerRelayer__factory,
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
  GyroConfig,
  GyroConfig__factory,
  LidoRelayer,
  LidoRelayer__factory,
  LiquidityGaugeV5__factory,
  Multicall,
  Multicall__factory,
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
  gyroConfig?: GyroConfig;
  lidoRelayer?: LidoRelayer;
  liquidityGauge: ContractFactory;
  multicall: Multicall;
  relayer: Contract;
  vault: Vault;
  veBal?: VeBal;
  veBalProxy?: VeBalProxy;
  weightedPoolFactory?: WeightedPoolFactory;
  yearnLinearPoolFactory?: YearnLinearPoolFactory;
}

export class Contracts {
  contractAddresses: ContractAddresses;
  private instances: ContractInstances;

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

    const vault: Vault = Vault__factory.connect(
      this.contractAddresses.vault,
      provider
    );
    const balancerHelpers: BalancerHelpers = BalancerHelpers__factory.connect(
      this.contractAddresses.balancerHelpers,
      provider
    );
    let lidoRelayer: undefined | LidoRelayer;
    if (this.contractAddresses.lidoRelayer)
      lidoRelayer = LidoRelayer__factory.connect(
        this.contractAddresses.lidoRelayer,
        provider
      );

    const multicall: Multicall = Multicall__factory.connect(
      this.contractAddresses.multicall,
      provider
    );
    const relayer = BalancerRelayer__factory.connect(
      this.contractAddresses.balancerRelayer,
      provider
    );
    let veBal: undefined | VeBal;
    if (this.contractAddresses.veBal) {
      veBal = new VeBal(this.contractAddresses.veBal, multicall);
    }
    let veBalProxy: undefined | VeBalProxy;
    if (this.contractAddresses.veBalProxy) {
      veBalProxy = new VeBalProxy(this.contractAddresses, provider);
    }
    let gaugeClaimHelper: undefined | GaugeClaimHelper;
    if (this.contractAddresses.gaugeClaimHelper)
      gaugeClaimHelper = GaugeClaimHelper__factory.connect(
        this.contractAddresses.gaugeClaimHelper,
        provider
      );
    let composableStablePoolFactory: undefined | ComposableStablePoolFactory;
    if (this.contractAddresses.composableStablePoolFactory) {
      composableStablePoolFactory =
        ComposableStablePoolFactory__factory.connect(
          this.contractAddresses.composableStablePoolFactory,
          provider
        );
    }
    let weightedPoolFactory: undefined | WeightedPoolFactory;
    if (this.contractAddresses.weightedPoolFactory) {
      weightedPoolFactory = WeightedPoolFactory__factory.connect(
        this.contractAddresses.weightedPoolFactory,
        provider
      );
    }
    let aaveLinearPoolFactory: undefined | AaveLinearPoolFactory;
    if (this.contractAddresses.aaveLinearPoolFactory) {
      aaveLinearPoolFactory = AaveLinearPoolFactory__factory.connect(
        this.contractAddresses.aaveLinearPoolFactory,
        provider
      );
    }
    let erc4626LinearPoolFactory: undefined | ERC4626LinearPoolFactory;
    if (this.contractAddresses.erc4626LinearPoolFactory) {
      erc4626LinearPoolFactory = ERC4626LinearPoolFactory__factory.connect(
        this.contractAddresses.erc4626LinearPoolFactory,
        provider
      );
    }
    let eulerLinearPoolFactory: undefined | EulerLinearPoolFactory;
    if (this.contractAddresses.eulerLinearPoolFactory) {
      eulerLinearPoolFactory = EulerLinearPoolFactory__factory.connect(
        this.contractAddresses.eulerLinearPoolFactory,
        provider
      );
    }
    let gearboxLinearPoolFactory: undefined | GearboxLinearPoolFactory;
    if (this.contractAddresses.gearboxLinearPoolFactory) {
      gearboxLinearPoolFactory = GearboxLinearPoolFactory__factory.connect(
        this.contractAddresses.gearboxLinearPoolFactory,
        provider
      );
    }
    let yearnLinearPoolFactory: undefined | YearnLinearPoolFactory;
    if (this.contractAddresses.yearnLinearPoolFactory) {
      yearnLinearPoolFactory = YearnLinearPoolFactory__factory.connect(
        this.contractAddresses.yearnLinearPoolFactory,
        provider
      );
    }
    let gyroConfig: undefined | GyroConfig;
    if (this.contractAddresses.gyroConfigProxy) {
      gyroConfig = GyroConfig__factory.connect(
        this.contractAddresses.gyroConfigProxy,
        provider
      );
    }

    this.instances = {
      aaveLinearPoolFactory,
      balancerHelpers,
      BasePool: this.getBasePool,
      composableStablePoolFactory,
      ERC20: this.getErc20,
      erc4626LinearPoolFactory,
      eulerLinearPoolFactory,
      gaugeClaimHelper,
      gearboxLinearPoolFactory,
      gyroConfig,
      liquidityGauge: this.getLiquidityGauge,
      lidoRelayer,
      multicall,
      relayer,
      veBal,
      veBalProxy,
      weightedPoolFactory,
      yearnLinearPoolFactory,
      vault,
    };
  }

  /**
   * Expose contract instances.
   */
  get contracts(): ContractInstances {
    return this.instances;
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
  getLiquidityGauge = LiquidityGaugeV5__factory.connect;
}
