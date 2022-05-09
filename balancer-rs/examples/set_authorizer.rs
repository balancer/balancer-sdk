use std::str::FromStr;
use web3::types::Address;

/**
 * Examples
 * For documentation about the Vault contract API:
 * https://dev.balancer.fi/references/contracts/apis/the-vault
 */

// TODO: NOT WORKING - Either fix or remove
#[tokio::main]
async fn main() {
  let web3 = balancer_rs::infura::build_web3();
  let vault = balancer_rs::Vault::new(web3);

  let authorizer = Address::from_str("0xA331D84eC860Bf466b4CdCcFb4aC09a1B43F3aE6").unwrap();

  let response = vault.set_authorizer(authorizer).await;

  let resp_str = web3::helpers::to_string(&response);

  println!("Balancer Vault Authorizer address {}", resp_str)
}
