/**
 * Examples
 * For documentation about the Vault contract API:
 * https://dev.balancer.fi/references/contracts/apis/the-vault
 */
mod helpers;

#[tokio::main]
async fn main() {
  helpers::print_start_new_example("WETH");

  let web3 = balancer_rs::infura::build_web3();
  let vault = balancer_rs::Vault::new(web3);
  let weth_address = vault.weth().await;
  let address_str = web3::helpers::to_string(&weth_address);

  println!("Balancer Vault WETH address {}", address_str)
}
