use dotenv;

pub mod errors;
pub mod tokens;

pub use tokens::*;

use crate::Web3;

pub fn build_web3(rpc_endpoint: &str) -> Web3 {
    let transport = ethcontract::web3::transports::Http::new(rpc_endpoint).unwrap();
    Web3::new(transport)
}

pub fn get_env_var(key: &str) -> String {
    dotenv::dotenv().ok();
    dotenv::var(key).unwrap()
}
