extern crate hexutil;

use super::generated_contracts::vault::Vault as GeneratedVault;
use std::str::FromStr;

// This should always be the same address across chains
const VAULT_CONTRACT_ADDRESS: &'static str = "0xBA12222222228d8Ba445958a75a0704d566BF2C8";

pub struct Vault {}

impl Vault {
  pub fn new(web3: ethcontract::Web3<ethcontract::web3::transports::Http>) -> GeneratedVault {
    let vault_address = super::addr!(&VAULT_CONTRACT_ADDRESS);
    return GeneratedVault::at(&web3, vault_address);
  }
}
