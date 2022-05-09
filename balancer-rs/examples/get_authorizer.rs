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
  let auth_addr = vault.get_authorizer().await;
  let address_str = web3::helpers::to_string(&auth_addr);

  println!("Balancer Vault Authorizer address {}", address_str)
}
