//! Defines the vault struct and its methods.

pub use super::generated_contracts::vault::Vault;
use std::str::FromStr;

/// This should always be the same address across chains
const VAULT_CONTRACT_ADDRESS: &str = "0xBA12222222228d8Ba445958a75a0704d566BF2C8";

impl Vault {
  #[allow(clippy::new_ret_no_self)]
  pub fn new(web3: ethcontract::Web3<ethcontract::web3::transports::Http>) -> Self {
    let vault_address = super::addr!(VAULT_CONTRACT_ADDRESS);
    Vault::at(&web3, vault_address)
  }
}
