extern crate balancer_rs;

mod helpers;
mod sample_data;

use balancer_rs::*;
use helpers::*;
use std::str::FromStr;

/// Check the spender allowance for the Vault for a particular token.
/// In this case, we are checking the spending allowance for DAI.
///
/// If the allowance is 0, that means that your wallet has not approved
/// the Balancer Vault to spend your token. If this is true, you will not
/// be able to perfom an swaps.
pub async fn check_allowance() {
    print_start_new_example("Check allowance for token");

    let rpc_url: String = get_env_var("RPC_URL");
    let transport = ethcontract::web3::transports::Http::new(&rpc_url).unwrap();
    let web3 = ethcontract::Web3::new(transport);

    let token = addr!(sample_data::kovan::DAI_ADDRESS);

    let result = ERC20::at(&web3, token)
        .allowance(
            addr!(&get_env_var("WALLET_ADDRESS")),
            addr!(vault::VAULT_CONTRACT_ADDRESS),
        )
        .call()
        .await
        .unwrap();

    println!("Allowance result: {:#?}", result);
}

#[tokio::main]
async fn main() {
    check_allowance().await;
}
