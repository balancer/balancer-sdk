use dotenv::dotenv;
use std::env;

// builds the Infura endpoint from the env variables
pub fn build_url() -> String {
  dotenv().ok();

  let mut rpc_endpoint = "".to_owned();
  const INFURA_HOST: &str = "https://mainnet.infura.io/v3/";
  rpc_endpoint.push_str(INFURA_HOST);
  rpc_endpoint.push_str(&env::var("INFURA_PROJECT_ID").expect("Env key not present"));

  return rpc_endpoint.to_string();
}

pub fn build_web3() -> web3::Web3<web3::transports::Http> {
  let rpc_endpoint = build_url();
  let transport = web3::transports::Http::new(&rpc_endpoint).unwrap();

  return web3::Web3::new(transport);
}
