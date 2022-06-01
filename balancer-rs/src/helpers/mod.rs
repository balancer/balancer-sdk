extern crate hexutil;

use std::any::type_name;

pub mod conversions {
  pub use ethcontract::tokens::{Bytes, Tokenize};
  use ethers_core::utils;

  pub fn bytes32_to_string(value: ethcontract::Bytes<[u8; 32]>) -> String {
    value.into_token().to_string()
  }

  pub fn readable_string_to_swap_fee_percentage(value: &str) -> usize {
    let percentage = utils::parse_ether(value).unwrap();
    percentage.as_usize()
  }
}

pub fn type_of<T>(_: T) -> &'static str {
  type_name::<T>()
}

pub fn build_web3(rpc_endpoint: &str) -> web3::Web3<web3::transports::Http> {
  let transport = web3::transports::Http::new(rpc_endpoint).unwrap();
  web3::Web3::new(transport)
}

#[cfg(test)]
pub mod tests {
  // Note this useful idiom: importing names from outer (for mod tests) scope.
  use super::*;
  use ethcontract::tokens::Bytes;

  #[test]
  fn test_bytes32_to_string() {
    let bytes = Bytes([
      50, 41, 105, 105, 239, 20, 235, 12, 109, 41, 102, 156, 85, 13, 74, 4, 73, 19, 2, 48, 0, 2, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 128,
    ]);

    assert_eq!(
      conversions::bytes32_to_string(bytes),
      "32296969ef14eb0c6d29669c550d4a0449130230000200000000000000000080"
    );
  }

  #[test]
  fn test_readable_string_to_swap_fee_percentage() {
    let string = "0.15";
    let result = conversions::readable_string_to_swap_fee_percentage(string);

    assert_eq!(result.to_string(), "150000000000000000");
  }
}
