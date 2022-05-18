extern crate hexutil;

pub use ethcontract::tokens::{Bytes, Tokenize};
pub use ethcontract::Address;
pub use std::str::FromStr;

use ethcontract_common::abi::Token::FixedBytes;
use std::any::type_name;

pub fn hex_string_to_bytes32(string: &str) -> ethcontract::Bytes<[u8; 32]> {
  let hex_string = hexutil::read_hex(&string);
  let bytes = FixedBytes(hex_string.unwrap());
  return Bytes::from_token(bytes).unwrap();
}

pub fn type_of<T>(_: T) -> &'static str {
  type_name::<T>()
}

pub fn build_web3(rpc_endpoint: &str) -> web3::Web3<web3::transports::Http> {
  let transport = web3::transports::Http::new(&rpc_endpoint).unwrap();
  return web3::Web3::new(transport);
}

#[macro_export]
macro_rules! addr {
  ($address: expr) => {
    ethcontract::Address::from_str($address).unwrap()
  };
}

pub use addr;
