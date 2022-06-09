/**
 * This is a collection of examples for interacting with each of the Weighted Pool API methods.
 * Each method is run in main() below -- you can comment out whichever example you don't want
 * to run.
 *
 * The examples use the RPC_URL constant, but you can/should replace that with your own.
 */
extern crate balancer_rs;
mod helpers;

use balancer_rs::{constants::addresses::*, pools::*, *};
use ethcontract::U256;
use helpers::*;
use std::str::FromStr;

// HELPERS
// Helper to get the active instance that will interact with the ethereum node.
// You can replace the RPC_URL with whatever is your prefered rpc endpoint.
const RPC_URL: &str = "https://rpc.flashbots.net/";
const POOL_ADDRESS: &str = "0x01abc00e86c7e258823b9a055fd62ca6cf61a163";
fn get_pool_instance() -> WeightedPool {
    let transport = ethcontract::web3::transports::Http::new(RPC_URL).unwrap();
    let web3 = ethcontract::Web3::new(transport);
    let pool_address = addr!(POOL_ADDRESS);

    WeightedPool::new(web3, pool_address)
}

async fn on_swap() {
    print_start_new_example("On swap");

    let balance_token_in = u256!("1");
    let balance_token_out = u256!("2");

    let request = SwapRequest {
        kind: SwapKind::GivenIn,
        token_in: addr!(UNI_ADDRESS),
        token_out: addr!(AAVE_ADDRESS),
        amount: u256!("1234"),
        pool_id: PoolId("01abc00e86c7e258823b9a055fd62ca6cf61a16300010000000000000000003b").into(),
        last_change_block: u256!("12345"),
        from: addr!("0xBA12222222228d8Ba445958a75a0704d566BF2C8"),
        to: addr!("0xBA12222222228d8Ba445958a75a0704d566BF2C8"),
        user_data: UserData("0x").into(),
    };

    let pool_instance = get_pool_instance();
    let deltas = match pool_instance
        .on_swap(request.into(), balance_token_in, balance_token_out)
        .call()
        .await
    {
        Ok(any) => any,
        Err(e) => {
            println!(
      "
      This will likely fail with BAL#304 - you would need to get the balance amounts correct for it to pass. 
      However, if you get an error, that means that the call to the Ethereum node was successful!
      ");

            println!("Error {:#?}", e);

            return;
        }
    };

    println!("Deltas {:?}", deltas);
}

/**
 * All methods for the Vault API are supported and type secure.
 */
#[tokio::main]
async fn main() {
    on_swap().await;
}
