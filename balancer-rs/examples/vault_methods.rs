/**
 * This is a collection of examples for interacting with each of the Vault API methods.
 * Each method is run in main() below -- you can comment out whichever example you don't want
 * to run.
 *
 * The examples use the RPC_URL constant, but you can/should replace that with your own.
 */
mod helpers;

extern crate balancer_rs;

pub use ethcontract::Address;
pub use std::str::FromStr;

// HELPERS

// Helper to get the active instance that will interact with the ethereum node.
// You can replace the RPC_URL with whatever is your prefered rpc endpoint.
const RPC_URL: &'static str = "https://rpc.flashbots.net/";
fn get_vault_instance() -> balancer_rs::generated_contracts::vault::Vault {
  return balancer_rs::vault::get_contract_instance(RPC_URL);
}

// VAULT API EXAMPLES
async fn get_authorizer() {
  helpers::print_start_new_example("Vault#getAuthorizer");

  let instance = get_vault_instance();
  let authorizer = instance.get_authorizer().call().await.unwrap();

  println!("Balancer Pool authorizer address {:#?}", authorizer);
}

async fn set_authorizer() {
  helpers::print_start_new_example("Vault#setAuthorizer");

  let instance = get_vault_instance();
  let some_addr = "0xBA12222222228d8Ba445958a75a0704d566BF2C8";
  let auth_addr = Address::from_str(some_addr).unwrap();

  let result = match instance.set_authorizer(auth_addr).call().await {
    Ok(any) => any,
    Err(e) => println!(
      "This should fail - caller must be allowed by the current Authorizer. {}",
      e
    ),
  };

  println!("Balancer Pool set authorizer result {:#?}", result);
}

async fn has_approved_relayer() {
  helpers::print_start_new_example("Vault#hasApprovedRelayer");

  let instance = get_vault_instance();
  let some_user_addr = "0xBA12222222228d8Ba445958a75a0704d566BF2C8";
  let some_relayer_addr = "0xBA12222222228d8Ba445958a75a0704d566BF2C8";
  let user_addr = Address::from_str(some_user_addr).unwrap();
  let relayer_addr = Address::from_str(some_relayer_addr).unwrap();

  // This will fail - The caller must be allowed by the current Authorizer to do this.
  let result = instance
    .has_approved_relayer(user_addr, relayer_addr)
    .call()
    .await
    .unwrap();

  println!("Has approved relayer? {:#?}", result);
}

async fn get_internal_balance() {
  helpers::print_start_new_example("Vault#getInternalBalance");

  let instance = get_vault_instance();
  let some_user_addr = "0x85B0Acce5798bEAf27FEBe56572D7567b06c4B07";
  let wrapped_eth_addr = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
  let user_addr = Address::from_str(some_user_addr).unwrap();
  let wrapped_eth_addr = Address::from_str(wrapped_eth_addr).unwrap();
  let tokens = vec![wrapped_eth_addr];

  // This will fail - The caller must be allowed by the current Authorizer to do this.
  let result = instance
    .get_internal_balance(user_addr, tokens)
    .call()
    .await
    .unwrap();

  println!("User {:#?} has a balance of {:#?} WETH", user_addr, result);
}

async fn get_pool() {
  helpers::print_start_new_example("Vault#getPool");

  let instance = get_vault_instance();
  let pool_id = "0x32296969ef14eb0c6d29669c550d4a0449130230000200000000000000000080";
  let hex_string = balancer_rs::helpers::hex_string_to_bytes32(pool_id);
  let address_str = instance.get_pool(hex_string).call().await.unwrap();

  println!(
    "Balancer Pool address {:#?} for pool id {:#?}",
    pool_id, address_str
  )
}

async fn weth() {
  helpers::print_start_new_example("Vault#WETH");

  let instance = get_vault_instance();
  let weth_address = instance.weth().call().await.unwrap();

  println!("Balancer Vault WETH address {:#?}", weth_address);
}

/**
 * All methods for the Vault API are supported and type secure.
 */
#[tokio::main]
async fn main() {
  get_authorizer().await;
  set_authorizer().await;
  has_approved_relayer().await;
  get_internal_balance().await;
  get_pool().await;
  weth().await;
}
