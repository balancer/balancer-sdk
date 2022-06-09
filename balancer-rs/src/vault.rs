//! Defines the vault struct and its methods.
//!
//! # What is the Vault?
//! It is a single contract that holds and manages all the assets added by all Balancer pools. This allows Balancer to take full advantage of its multi-pool trading routing in order to offer the best trade routing options.
//! ## How does the Vault work?
//! Balancer V2 separates the Automated Market Maker (AMM) logic from the token management and accounting. Token management/accounting is done by the Vault while the AMM logic is individual to each pool.
//! Because pools are contracts external to the Vault, they can implement any arbitrary, customized AMM logic.
//!
//!  # Examples
//!  Basic usage:
//!
//! ## Create instance
//!
//! ```
//! use balancer_rs::vault::Vault;
//!
//! const RPC_URL: &str = balancer_rs::constants::rpc_endpoints::KOVAN_TESTNET;
//!
//! let transport = ethcontract::web3::transports::Http::new(RPC_URL).unwrap();
//! let web3 = ethcontract::Web3::new(transport);
//! Vault::new(web3);
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
