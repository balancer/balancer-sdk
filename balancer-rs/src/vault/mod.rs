use web3::contract::Contract;
use web3::types::Address;

#[allow(dead_code)]
pub fn get_contract(
  web3: &web3::Web3<web3::transports::Http>,
  vault_address: Address,
) -> Contract<web3::transports::Http> {
  return Contract::from_json(
    web3.eth(),
    vault_address,
    include_bytes!("../abis/vault.json"),
  )
  .unwrap();
}
