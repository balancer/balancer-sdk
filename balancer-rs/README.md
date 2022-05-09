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

Example to get the WETH address:

```rust
let vault = balancer_rs::Vault::new(web3);
let weth_address = vault.weth().await;
```

### Environment Variables

```
INFURA_PROJECT_ID
WALLET_ADDRESS
PRIVATE_KEY
```

### Testing

Integration tests go in `./tests`

To run tests:

`cargo test`

## Contributing

TBD

## Examples

To see examples of all Vault methods available, see the examples [here.](./examples/)

To run an example:

`cargo run --example [name]`

## Examples List - Vault Methods

### Authorization

- [x] getAuthorizer [`#get_authorizer`](./examples/get_authorizer.rs)
- [ ] setAuthorizer [`#set_authorizer`](./examples/set_authorizer.rs)
- [ ] hasApprovedRelayer

### Internal Balances

- [ ] getInternalBalances
- [ ] manageUserBalance

### Pools

- [ ] regiserPools
- [ ] getPool
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
