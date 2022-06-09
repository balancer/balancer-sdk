extern crate balancer_rs;

mod helpers;
mod sample_data;

use std::str::FromStr;

use balancer_rs::*;
use ethcontract::PrivateKey;
use helpers::*;

pub async fn approve_token() {
    print_start_new_example("Set approval on token for spender (set allowance for Balancer Vault)");

    let rpc_url: String = get_env_var("RPC_URL");
    let transport = ethcontract::web3::transports::Http::new(&rpc_url).unwrap();
    let web3 = ethcontract::Web3::new(transport);

    let token = addr!(sample_data::kovan::USDC_ADDRESS);
    let private_key = PrivateKey::from_str(&get_env_var("PRIVATE_KEY")).unwrap();
    let token_approver =
        TokenApprover::new(web3, addr!(vault::VAULT_CONTRACT_ADDRESS), private_key);

    let result = token_approver
        .approve(token, u256!("1000000000000000000"))
        .await
        .unwrap();

    println!("Approval result: {:#?}", result);
}

#[tokio::main]
async fn main() {
    approve_token().await
}
