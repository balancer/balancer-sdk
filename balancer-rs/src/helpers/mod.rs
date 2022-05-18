extern crate hexutil;

pub use ethcontract::Address;

use std::any::type_name;

pub mod conversions {
  pub use ethcontract::tokens::{Bytes, Tokenize};
  use ethcontract_common::abi::Token::FixedBytes;
  use ethers_core::utils;

  pub fn hex_string_to_bytes32(string: &str) -> ethcontract::Bytes<[u8; 32]> {
    let hex_string = hexutil::read_hex(&string);
    let bytes = FixedBytes(hex_string.unwrap());
    return Bytes::from_token(bytes).unwrap();
  }

  pub fn bytes32_to_string(value: ethcontract::Bytes<[u8; 32]>) -> String {
    return value.into_token().to_string();
  }

  pub fn readable_string_to_swap_fee_percentage(value: &str) -> usize {
    let percentage = utils::parse_ether(value).unwrap();
    return percentage.as_usize();
  }
}

pub fn type_of<T>(_: T) -> &'static str {
  type_name::<T>()
}

pub fn build_web3(rpc_endpoint: &str) -> web3::Web3<web3::transports::Http> {
  let transport = web3::transports::Http::new(&rpc_endpoint).unwrap();
  return web3::Web3::new(transport);
}

pub mod macros {
  pub use std::str::FromStr;

  #[macro_export]
  macro_rules! addr {
    ($address: expr) => {
      ethcontract::Address::from_str($address).unwrap()
    };
  }

  pub use addr;
}
