# Balancer Rust SDK

This project was funded by the [Balancer Grants subDAO](http://grants.balancer.community/). [Read the press release on Medium](https://medium.com/@BalancerGrants/balancer-is-adding-rust-support-c28bdc1305e6).

## Rust tools for interacting with Balancer Protocol V2 in Rust.

_DISCLAIMER: While balancer-rs is intended to be a useful tool to simplify interacting with Balancer V2 Smart Contracts, this package is an ALPHA-build and should be considered as such. Use at your own risk! This package is capable of sending Ethereum (or EVM compatible) tokens controlled by whatever private key you provide. User assumes all liability for using this software; contributors to this package are not liable for any undesirable results. Users are STRONGLY encouraged to experiment with this package on testnets before using it on mainnet with valuable assets._

## Project Goal

There isn’t currently any Rust support in the Balancer ecosystem, so this SDK is a great way to attract Rust developers, as well as bring a popular, fast, and secure language to the growing collection of SDKs Balancer provides. Specifically, the Rust SDK will provide full Rust language support for interacting with:

- [Balancer Vault Contract](https://dev.balancer.fi/references/contracts/apis/the-vault)
- [Balancer Pools](https://dev.balancer.fi/references/contracts/apis/pools)

## Usage

balancer-rs has been tested on:

- MacOS using Rust 2021 edition
<!-- - Linux using Python 3.9-dev
- Windows using Python 3.9.5 -->

### Install from crate

The balancer-rs sdk can be installed as a crate from [https://crates.io/](https://crates.io/). Simply add the following to your `[dependencies]` in your Rust project's `Cargo.toml` file:

```
[dependencies]
balancer_rs = "*"
```

Once installed, you will be able to use the Balancer Rust module as follows:

Example Vault usage ([see in examples](./examples/vault_methods.rs)):

```rust
fn main() {
  let rpc_url = "https://rpc.flashbots.net/";
  let transport = ethcontract::web3::transports::Http::new(rpc_url).unwrap();
  let web3 = ethcontract::Web3::new(transport);

  let vault_instance = balancer_rs::vault::Vault::new(web3);

  let weth_address = vault_instance.weth().call().await.unwrap();
}
```

Example to get the vault address via a pool ([see in examples](./examples/base_pool_methods.rs)):

```rust
use balancer_rs::helpers::macros::*;

fn main() {
  let rpc_url = "https://rpc.flashbots.net/";
  let transport = ethcontract::web3::transports::Http::new(rpc_url).unwrap();
  let web3 = ethcontract::Web3::new(transport);

  let pool_address = addr!("0x01abc00e86c7e258823b9a055fd62ca6cf61a163");
  let weighted_pool_instance = balancer_rs::pools::WeightedPool::new(web3, addr!(pool_address));
  let vault_address = weighted_pool_instance.getVault().call().await.unwrap();
}
```

### Testing

Integration tests go in `./tests`

To run tests:

`cargo test`

## Contributing

### Adding new pool support

Balancer continues to add new pool types that have new contract APIs. To add support for a new pool:

- Add a new json file with a contract name (important) and abi filed with the contract's abi
- Add the pool to the `build.rs` script like the others
- Run `cargo build`
- Add the new pool to the pools module
- Done!

## Examples

To see examples of all Vault methods available, see the examples [here.](./examples/)

To run an example:

`cargo run --example [name]`

## Examples List - [Vault Methods](https://dev.balancer.fi/references/contracts/apis/the-vault)

### Authorization

- [x] getAuthorizer [`#get_authorizer`](./examples/get_authorizer.rs)
- [x] setAuthorizer [`#set_authorizer`](./examples/set_authorizer.rs)
- [x] hasApprovedRelayer

### Internal Balances

- [x] getInternalBalances
- [ ] manageUserBalance

### Pools

- [ ] regiserPools
- [x] getPool
- [ ] registerTokens
- [ ] deregisterTokens
- [ ] getPoolTokenInfo
- [ ] getPoolTokens

### Joins and Exits

- [ ] joinPool
- [ ] exitPool

### Single Swaps

- [ ] swap

### Batch Swaps

- [ ] batchSwap
- [ ] queryBatchSwap

### Flash Loans

- [ ] flashLoan

### Flash Loans

- [ ] flashLoan

### Asset Management

- [ ] managePoolBalance

### Miscellaneous

- [ ] getProtocolFeesCollector
- [ ] setPaused
- [x] WETH [`#weth`](./examples/weth.rs)

## Examples List - Pool Methods

### [Base Pool](https://dev.balancer.fi/references/contracts/apis/pools)

- [x] getVault
- [x] getPoolId
- [x] setSwapFeePercentage
- [ ] setPaused
- [ ] on{Join,Exit}Pool
- [ ] on{Join,Exit}Pool

### [Weighted Pool](https://dev.balancer.fi/references/contracts/apis/pools/weightedpool)

- [x] onSwap

### [WeightedPool2Tokens](https://dev.balancer.fi/references/contracts/apis/pools/weightedpool2tokens)

- [ ] onSwap
- [ ] enableOracle
- [ ] getMiscData
- [ ] getLargestSafeQueryWindow
- [ ] getLatest
- [ ] getTimeWeightedAverage
- [ ] getPastAccumulators

### [LiquidityBootstrappingPool](https://dev.balancer.fi/references/contracts/apis/pools/liquiditybootstrappingpool)

#### API

- [ ] onSwap
- [ ] getSwapEnabled
- [ ] getGradualWeightUpdateParam
- [ ] getGradualWeightUpdateParam

#### Permissioned Functions

- [ ] setSwapEnabled
- [ ] updateWeightsGradually

### [ManagedPools](https://dev.balancer.fi/references/contracts/apis/pools/investmentpools)

#### API

- [ ] onSwap
- [ ] getSwapEnabled
- [ ] getManagementSwapFeePercentage
- [ ] getMinimumWeightChangeDuration
- [ ] getCollectedManagementFees
- [ ] getCollectedManagementFees

#### Permissioned Functions

- [ ] setSwapEnabled
- [ ] updateWeightsGradually
- [ ] withdrawCollectedManagementFees

### [StablePools](https://dev.balancer.fi/references/contracts/apis/pools/stablepools)

#### API

- [ ] onSwap
- [ ] getAmplificationParameter

#### Permissioned Functions

- [ ] startAmplificationParameterUpdate
- [ ] stopAmplificationParameterUpdate

### [MetaStablePools](https://dev.balancer.fi/references/contracts/apis/pools/metastablepools)

#### API

- [ ] onSwap
- [ ] getAmplificationParameter
- [ ] enableOracle
- [ ] getMiscData
- [ ] getLargestSafeQueryWindow
- [ ] getLatest
- [ ] getTimeWeightedAverage
- [ ] getPastAccumulators
- [ ] getRateProviders
- [ ] getPriceRateCache
- [ ] updatePriceRateCache

#### Permissioned Functions

- [ ] startAmplificationParameterUpdate
- [ ] stopAmplificationParameterUpdate
- [ ] setPriceRateCacheDuration
