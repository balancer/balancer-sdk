//! Defines the vault struct and its methods.
//!
//! # What is the Vault?
//! It is a single contract that holds and manages all the assets added by all Balancer pools. This allows Balancer to take full advantage of its multi-pool trading routing in order to offer the best trade routing options.
//! ## How does the Vault work?
//! Balancer V2 separates the Automated Market Maker (AMM) logic from the token management and accounting. Token management/accounting is done by the Vault while the AMM logic is individual to each pool.
//! Because pools are contracts external to the Vault, they can implement any arbitrary, customized AMM logic.
//!
//! # Examples
//! The tested examples below show basic usage of the Vault. For more examples, see the examples directory.
//!
//! ### Create instance
//! ```rust
//! use balancer_sdk::vault::Vault;
//!
//! const RPC_URL: &str = balancer_sdk::constants::rpc_endpoints::KOVAN_TESTNET;
//! let transport = ethcontract::web3::transports::Http::new(RPC_URL).unwrap();
//! let web3 = ethcontract::Web3::new(transport);
//!
//! Vault::new(web3);
//! ```
//!
//! ### Get Authorizer
//! ```no_run
//! use balancer_sdk::vault::Vault;
//! # use balancer_sdk::helpers::*;
//!
//! # tokio_test::block_on(async {
//! # let web3 = build_web3(&get_env_var("RPC_URL"));
//! Vault::new(web3).get_authorizer().call().await.unwrap()
//! # });
//! ```
//!
//! ### Get Pool
//! ```no_run
//! use balancer_sdk::vault::Vault;
//! # use balancer_sdk::helpers::*;
//! use balancer_sdk::*;
//!
//! # tokio_test::block_on(async {
//! # let web3 = build_web3(&get_env_var("RPC_URL"));
//! let pool_id = PoolId("0x0371c272fdd28ac13c434f1ef6b8b52ea3e6d844");
//! Vault::new(web3).get_pool(pool_id.into()).call().await.unwrap()
//! # });
//! ```

pub use super::generated_contracts::vault::Vault;
use crate::Address;
use std::str::FromStr;

/// This should always be the same address across chains
pub const VAULT_CONTRACT_ADDRESS: &str = "0xBA12222222228d8Ba445958a75a0704d566BF2C8";

impl Vault {
    pub fn new(web3: ethcontract::Web3<ethcontract::web3::transports::Http>) -> Self {
        let vault_address = super::addr!(VAULT_CONTRACT_ADDRESS);
        Vault::at(&web3, vault_address)
    }
}
