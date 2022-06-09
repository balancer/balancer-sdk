use dotenv;

pub mod errors;
pub mod tokens;

pub use tokens::*;

pub fn build_web3(rpc_endpoint: &str) -> web3::Web3<web3::transports::Http> {
    let transport = web3::transports::Http::new(rpc_endpoint).unwrap();
    web3::Web3::new(transport)
}

pub fn get_env_var(key: &str) -> String {
    dotenv::dotenv().ok();
    dotenv::var(key).unwrap()
}
