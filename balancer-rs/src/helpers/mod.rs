pub mod errors;

pub fn build_web3(rpc_endpoint: &str) -> web3::Web3<web3::transports::Http> {
  let transport = web3::transports::Http::new(rpc_endpoint).unwrap();
  web3::Web3::new(transport)
}
