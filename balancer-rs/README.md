# Balancer Rust SDK

## WARNING: THIS CRATE IS IN PRE-RELEASE ALPHA AND CHANGING ALMOST DAILY. THE INTERFACES MAY CHANGE.

This project was funded by the [Balancer Grants subDAO](http://grants.balancer.community/). [Read the press release on Medium](https://medium.com/@BalancerGrants/balancer-is-adding-rust-support-c28bdc1305e6).

## Rust tools for interacting with Balancer Protocol V2 in Rust.

_DISCLAIMER: While balancer-rs is intended to be a useful tool to simplify interacting with Balancer V2 Smart Contracts, this package is an ALPHA-build and should be considered as such. Use at your own risk! This package is capable of sending Ethereum (or EVM compatible) tokens controlled by whatever private key you provide. User assumes all liability for using this software; contributors to this package are not liable for any undesirable results. Users are STRONGLY encouraged to experiment with this package on testnets before using it on mainnet with valuable assets._

## Project Goal

There isn’t currently any Rust support in the Balancer ecosystem, so this SDK is a great way to attract Rust developers, as well as bring a popular, fast, and secure language to the growing collection of SDKs Balancer provides. Specifically, the Rust SDK will provide full Rust language support for interacting with:

- [Balancer Vault Contract](https://dev.balancer.fi/references/contracts/apis/the-vault)
- [Balancer Pools](https://dev.balancer.fi/references/contracts/apis/pools)

## Documentation

For complete usage documentation, including all interfaces, definitions, and extensive usage examples, see the [Rust Doc](https://docs.rs/crate/balancer_sdk)

## Usage

balancer-rs has been tested on:

- MacOS using Rust 2021 edition
<!-- - Linux using Python 3.9-dev
- Windows using Python 3.9.5 -->

### Install from crate

The balancer-rs sdk can be installed as a crate from [https://crates.io/](https://crates.io/). Simply add the following to your `[dependencies]` in your Rust project's `Cargo.toml` file:

```
[dependencies]
balancer_sdk = "*"
```

Once installed, you will be able to use the Balancer Rust module as follows:

### Example Usage

An example of how to get the WETH address from the Vault contract API

```rust
fn main() {
  let rpc_url = "https://rpc.flashbots.net/";
  let transport = ethcontract::web3::transports::Http::new(rpc_url).unwrap();
  let web3 = ethcontract::Web3::new(transport);

  let vault_instance = balancer_sdk::vault::Vault::new(web3);

  let weth_address = vault_instance.weth().call().await.unwrap();
}
```

### Testing

- Integration tests go in `./tests`
- Unit tests are colocated with files
- Example tests are in the documentation

To run tests:

`cargo test -all`

## Contributing

_TBD_

### Adding new pool support

Balancer continues to add new pool types that have new contract APIs. To add support for a new pool:

- Add a new json file with a contract name (important) and abi filed with the contract's abi
- Add the pool to the `build.rs` script like the others
- Run `cargo build`
- Add the new pool to the pools module
- Done!

## Examples

The [GIT repository](https://github.com/drewdrewthis/balancer-sdk/tree/develop/balancer-rs) contains a number of complete and working examples which can be found in the `./examples` directory.

To run an example:

`cargo run --example [name]`
