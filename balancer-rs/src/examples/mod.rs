// Simple fancy printing for the console
pub fn print_start_new_example(name: &str) {
  println!("----------------------------------------");
  println!("Example {}: ", &name);
  println!("");
}

// Example: Get the WETH address used by the vault address
pub async fn weth() {
  print_start_new_example("WETH");

  let web3 = balancer_rs::infura::build_web3();
  let vault = balancer_rs::Vault::new(web3);
  let weth_address = vault.weth().await;
  let address_str = web3::helpers::to_string(&weth_address);

  println!("Balancer Vault WETH address {}", address_str)
}
