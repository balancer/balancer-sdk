mod helpers;
use std::str::FromStr;
use web3::types::Address;

#[tokio::main]
async fn main() {
  helpers::print_start_new_example("Pool#getPoolId");

  let web3 = balancer_rs::infura::build_web3();
  let pool_address = Address::from_str("0x01abc00e86c7e258823b9a055fd62ca6cf61a163").unwrap();
  let pool_service = balancer_rs::pools::PoolService::new(web3);
  let auth_addr = pool_service.get_pool_id(pool_address).await;
  let address_str = web3::helpers::to_string(&auth_addr);

  println!(
    "Balancer pool id {} for address 0x01abc00e86c7e258823b9a055fd62ca6cf61a163",
    address_str
  )
}
