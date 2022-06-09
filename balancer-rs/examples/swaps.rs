//! # Examples: Swaps
//!
//! This is a collection of examples for the different types of swaps available through Balancer's protocol.
//! It uses the following env variables from a .env file:
//!
//! - `RPC_URL`
//! - `PRIVATE_KEY`

extern crate balancer_rs;
mod helpers;
mod sample_data;

use balancer_rs::helpers::errors::handle_bal_error;
use balancer_rs::helpers::get_env_var;
use balancer_rs::vault::Vault;
use balancer_rs::*;
use ethcontract::Account;
use ethcontract::Address;
use ethcontract::PrivateKey;
use ethcontract::I256;
use ethcontract::U256;
use helpers::*;
use std::str::FromStr;

const RECIPIENT_WALLET_ADDRESS: &str = "0x35f5a330FD2F8e521ebd259FA272bA8069590741";
const SENDER_WALLET_ADDRESS: &str = "0x35f5a330FD2F8e521ebd259FA272bA8069590741";

// HELPERS

// Helper to get the active instance that will interact with the ethereum node.
// You can replace the RPC_URL with whatever is your prefered rpc endpoint.
fn get_vault_instance() -> Vault {
    let rpc_url: String = get_env_var("RPC_URL");
    let transport = ethcontract::web3::transports::Http::new(&rpc_url).unwrap();
    let web3 = ethcontract::Web3::new(transport);

    Vault::new(web3)
}

// Examples
#[allow(dead_code)]
pub async fn query_batch_swap() {
    print_start_new_example("Vault#queryBatchSwap");

    let instance = get_vault_instance();

    let assets = vec![
        addr!(sample_data::kovan::USDC_ADDRESS),
        addr!(sample_data::kovan::DAI_ADDRESS),
    ];

    let swap_step = BatchSwapStep::new(
        PoolId(sample_data::kovan::POOLS[1].id),
        0,
        1,
        "10",
        UserData("0x"),
    );

    let funds = FundManagement {
        sender: addr!(SENDER_WALLET_ADDRESS),
        from_internal_balance: false,
        recipient: addr!(RECIPIENT_WALLET_ADDRESS),
        to_internal_balance: false,
    };

    let deltas = match instance
        .query_batch_swap(
            SwapKind::GivenIn.into(),
            vec![swap_step.clone().into()],
            assets,
            funds.into(),
        )
        .call()
        .await
    {
        Ok(any) => any,
        Err(e) => {
            println!("Failed to query: {}", e);
            handle_bal_error(&e);
            return;
        }
    };

    println!("Asset deltas for {:#?} are {:#?}", swap_step, deltas);
}

/// Executes a single swap of USDC for DAI via the Vault for a particular pool.
///
/// Successful swap transaction: https://kovan.etherscan.io/tx/0xfcb6d38c73841f37bd4bf5d0e1245822a8c2457877cf071390d04fce336ce7d5
pub async fn single_swap() {
    print_start_new_example("Vault#singleSwap");

    let instance = get_vault_instance();

    let swap_step = SingleSwap {
        pool_id: PoolId(sample_data::kovan::POOLS[1].id).into(),
        kind: SwapKind::GivenIn,
        asset_in: addr!(sample_data::kovan::USDC_ADDRESS),
        asset_out: addr!(sample_data::kovan::DAI_ADDRESS),
        amount: u256!("10"),
        user_data: UserData("0x").into(),
    };

    let funds = FundManagement {
        sender: addr!(SENDER_WALLET_ADDRESS),
        from_internal_balance: false,
        recipient: addr!(RECIPIENT_WALLET_ADDRESS),
        to_internal_balance: false,
    };

    let limit = u256!("9125892514880");

    let deadline = u256!("999999999999999999");

    let private_key = PrivateKey::from_str(&get_env_var("PRIVATE_KEY")).unwrap();

    let result = match instance
        .swap(swap_step.clone().into(), funds.into(), limit, deadline)
        .from(Account::Offline(private_key, Some(42)))
        .gas(4_712_388.into())
        .gas_price(u256!("100000000000").into())
        .send()
        .await
    {
        Ok(any) => any,
        Err(e) => {
            println!("Failed to build transaction. Please make sure that you've approved the required tokens for spending. See the `check_allowance` example.");
            println!("{:#?}", e);
            return;
        }
    };

    println!("Batch swap result {:#?} for swap {:#?}", result, swap_step);
}

/// Executes a batch swap with a single swap step.
///
/// # Batch Swap
///
/// ## Gotchas
/// - If you don't provide gas, gas_price, or nonce, the interal [`TransactionBuilder`] will have to make a call to the node to get those values.
/// - If the transaction will fail, then getting these values will fail as well, even on the `build` step.
/// - If you haven't approved the tokens for spending, it will fail.
///
/// Successful batch swap transaction on Kovan: https://kovan.etherscan.io/tx/0x2f7603dc9dbc0ae406bdfd95abe06d3d90152d329fad4faf1021954978468993
#[allow(dead_code)]
pub async fn batch_swap() {
    print_start_new_example("Vault#batchSwap");

    let instance = get_vault_instance();

    let assets = vec![
        addr!(sample_data::kovan::USDC_ADDRESS),
        addr!(sample_data::kovan::DAI_ADDRESS),
    ];

    let limits = vec![i256!("1000000000000000000"), i256!("1000000000000000000")];

    let swap_step = BatchSwapStep::new(
        PoolId(sample_data::kovan::POOLS[1].id),
        0,
        1,
        "10",
        UserData("0x"),
    );

    let funds = FundManagement {
        sender: addr!(SENDER_WALLET_ADDRESS),
        from_internal_balance: false,
        recipient: addr!(RECIPIENT_WALLET_ADDRESS),
        to_internal_balance: false,
    };

    let private_key = get_env_var("PRIVATE_KEY");
    let private_key_secure = PrivateKey::from_str(&private_key).unwrap();

    let result = match instance
        .batch_swap(
            SwapKind::GivenIn.into(),
            vec![swap_step.clone().into()],
            assets,
            funds.into(),
            limits,
            // Infinity
            u256!("999999999999999999"),
        )
        .from(Account::Offline(private_key_secure, None))
        .gas(4_712_388.into())
        .gas_price(u256!("100000000000").into())
        // .confirmations(1)
        .send()
        .await
    {
        Ok(any) => any,
        Err(e) => {
            println!("Failed to execute batch swap");
            println!("{:#?}", e);
            return;
        }
    };

    println!("Batch swap result {:#?} for swap {:#?}", result, swap_step);
}

/// All methods for the Vault API are supported and type secure.
#[tokio::main]
async fn main() {
    query_batch_swap().await;
    // single_swap().await;
    // batch_swap().await;
}
