extern crate hexutil;

pub mod vault_service;

use super::generated_contracts::vault::Vault;

pub use ethcontract::tokens::{Bytes, Tokenize};
pub use ethcontract_common::abi::Token::FixedBytes;
use std::str::FromStr;

const VAULT_CONTRACT_ADDRESS: &'static str = "0xBA12222222228d8Ba445958a75a0704d566BF2C8";

/**
 * This will build a vault contract instance.
 **/
pub fn get_contract_instance(rpc_endpoint: &str) -> Vault {
  let transport = ethcontract::web3::transports::Http::new(rpc_endpoint).unwrap();
  let web3 = ethcontract::Web3::new(transport);
  let vault_address = super::addr!(&VAULT_CONTRACT_ADDRESS);
  return Vault::at(&web3, vault_address);
}
