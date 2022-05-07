pub mod infura;
pub mod vault;
use std::str::FromStr;
use web3::contract::{Contract, Options};
use web3::types::Address;

const VAULT_CONTRACT_ADDRESS: &'static str = "0xBA12222222228d8Ba445958a75a0704d566BF2C8";

pub struct Vault {
  pub web3: web3::Web3<web3::transports::Http>,
  pub address: Address,
  pub contract: Contract<web3::transports::Http>,
}

impl Vault {
  pub fn new(web3: web3::Web3<web3::transports::Http>) -> Vault {
    let web3c = web3.clone();
    let vault_address = Address::from_str(&VAULT_CONTRACT_ADDRESS.to_string()).unwrap();
    let contract = vault::get_contract(&web3c, vault_address);

    Vault {
      web3: web3c,
      address: vault_address,
      contract,
    }
  }

  pub async fn weth(&self) -> Address {
    let address: &Address = &self
      .contract
      .query("WETH", (), None, Options::default(), None)
      .await
      .unwrap();

    return address.clone();
  }
}
