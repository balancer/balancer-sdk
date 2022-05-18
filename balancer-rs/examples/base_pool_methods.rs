/**
 * This is a collection of examples for interacting with each of the Base Vault API methods.
 * Each method is run in main() below -- you can comment out whichever example you don't want
 * to run.
 *
 * The examples use the RPC_URL constant, but you can/should replace that with your own.
 *
 * Since the Base Pool contract is inherited by all of the other pools, we can use any pool interface.
 * In these examples, we use the WeightedPool
 */
extern crate balancer_rs;
mod helpers;

use balancer_rs::generated_contracts::weighted_pool::WeightedPool;
use balancer_rs::helpers::conversions::*;
use balancer_rs::helpers::macros::*;
use balancer_rs::weighted_pool;
use ethers_core::utils;
use helpers::*;

// HELPERS

// Helper to get the active instance that will interact with the ethereum node.
// You can replace the RPC_URL with whatever is your prefered rpc endpoint.
const RPC_URL: &'static str = "https://rpc.flashbots.net/";
const POOL_ADDRESS: &'static str = "0x01abc00e86c7e258823b9a055fd62ca6cf61a163";
fn get_pool_instance() -> WeightedPool {
  let pool_address = addr!("0x01abc00e86c7e258823b9a055fd62ca6cf61a163");
  return weighted_pool::get_contract_instance(RPC_URL, pool_address);
}

// BASE POOL API EXAMPLES
async fn get_vault() {
  print_start_new_example("BasePool#getVault");

  let instance = get_pool_instance();
  let vault_address = instance.get_vault().call().await.unwrap();

  println!("Balancer Pool Vault Address {:#?}", vault_address,);
}

async fn get_pool_id() {
  print_start_new_example("BasePool#getPoolId");

  let instance = get_pool_instance();
  let id = instance.get_pool_id().call().await.unwrap();

  println!(
    "Balancer Pool Id {:#?} for pool with address {:#?}",
    bytes32_to_string(id),
    POOL_ADDRESS
  );
}

async fn get_swap_fee_percentage() {
  print_start_new_example("BasePool#getSwapFeePercentage");

  let instance = get_pool_instance();
  let fee = instance.get_swap_fee_percentage().call().await.unwrap();
  let fee_human_readable = utils::format_units(fee.as_usize(), 18 - 2).unwrap();

  println!(
    "Balancer Pool Id {:#?} swap fee percentage {:#?} ({})",
    POOL_ADDRESS,
    fee,
    format!("{:.4}%", fee_human_readable)
  );
}

/**
* Updates the pool's swap fee.

 Note: This can only be called by an authorized account, denoted by the pool's owner. There are three cases for swap fee control:

 - Swap Fees are immutable
  - Owner: 0x0000000000000000000000000000000000000000
 - Swap Fees are controlled by a third party (currently Gauntlet)
  - Owner: 0xBA1BA1ba1BA1bA1bA1Ba1BA1ba1BA1bA1ba1ba1B
 - Swap Fees are controlled by an account immutably set at pool creation
  - Owner: the account which was set at pool creation
*/
async fn set_swap_fee_percentage() {
  print_start_new_example("BasePool#setSwapFeePercentage");

  let instance = get_pool_instance();
  let percentage = readable_string_to_swap_fee_percentage("0.15");

  let result = match instance
    .set_swap_fee_percentage(percentage.into())
    .call()
    .await
  {
    Ok(any) => any,
    Err(e) => println!(
      "This should fail with BAL#401 if you are not the pool owner. {}",
      e
    ),
  };

  println!("Balancer Pool fee set? {:#?}", result);
}

/**
 * All methods for the Vault API are supported and type secure.
 */
#[tokio::main]
async fn main() {
  get_vault().await;
  get_pool_id().await;
  get_swap_fee_percentage().await;
  set_swap_fee_percentage().await;
}
