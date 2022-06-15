//!
//! This is a collection of examples for interacting with the Vault API methods.
//! Each method is run in main() below -- you can comment out whichever example you don't want
//! to run.
//!
//! The examples use the RPC_URL constant, but you can/should replace that with your own.

extern crate balancer_sdk;
mod helpers;
mod sample_data;

use balancer_sdk::helpers::errors::handle_bal_error;
use balancer_sdk::helpers::get_env_var;
use balancer_sdk::vault::Vault;
use balancer_sdk::*;
use ethcontract::Address;
use helpers::*;
use std::str::FromStr;

// HELPERS

// Helper to get the active instance that will interact with the ethereum node.
// You can replace the RPC_URL with whatever is your prefered rpc endpoint.
fn get_vault_instance() -> Vault {
    let rpc_url: String = get_env_var("RPC_URL");
    let transport = ethcontract::web3::transports::Http::new(&rpc_url).unwrap();
    let web3 = ethcontract::Web3::new(transport);

    Vault::new(web3)
}

// VAULT API EXAMPLES
#[allow(dead_code)]
async fn get_authorizer() {
    print_start_new_example("Vault#getAuthorizer");

    let instance = get_vault_instance();
    let authorizer = instance
        .get_authorizer()
        .call()
        .await
        .expect("getAuthorizer call failed");

    println!("Balancer Pool authorizer address {:#?}", authorizer);
}

#[allow(dead_code)]
async fn set_authorizer() {
    print_start_new_example("Vault#setAuthorizer");

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

#[allow(dead_code)]
async fn has_approved_relayer() {
    print_start_new_example("Vault#hasApprovedRelayer");

    let instance = get_vault_instance();
    let some_user_addr = "0xBA12222222228d8Ba445958a75a0704d566BF2C8";
    let some_relayer_addr = "0xBA12222222228d8Ba445958a75a0704d566BF2C8";
    let user_addr = Address::from_str(some_user_addr).unwrap();
    let relayer_addr = Address::from_str(some_relayer_addr).unwrap();

    let result = instance
        .has_approved_relayer(user_addr, relayer_addr)
        .call()
        .await
        .expect("This should fail - caller must be allowed by the current Authorizer.");

    println!("Has approved relayer? {:#?}", result);
}

#[allow(dead_code)]
async fn get_internal_balance() {
    print_start_new_example("Vault#getInternalBalance");

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
        .expect("Failed to get internal balance");

    println!("User {:#?} has a balance of {:#?} WETH", user_addr, result);
}

#[allow(dead_code)]
async fn get_pool() {
    print_start_new_example("Vault#getPool");

    let instance = get_vault_instance();
    let pool_id = PoolId::from_str(sample_data::kovan::POOLS[0].id).unwrap();

    let address_str = match instance.get_pool(pool_id.into()).call().await {
        Ok(address) => address,
        Err(ref e) => {
            println!("Failed to get pool: {}", e);
            handle_bal_error(e);
            return;
        }
    };

    println!(
        "Found Balancer Pool address {:#?} for pool id {:#?}",
        address_str, pool_id
    )
}

#[allow(dead_code)]
async fn weth() {
    print_start_new_example("Vault#WETH");

    let instance = get_vault_instance();
    let weth_address = instance.weth().call().await.expect("Failed to get WETH");

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
