extern crate hexutil;

pub mod macros {
  pub use ethcontract::tokens::{Bytes, Tokenize};
  pub use ethcontract_common::abi::Token::FixedBytes;
  pub use std::str::FromStr;

  #[macro_export]
  macro_rules! addr {
    ($address: expr) => {
      ethcontract::Address::from_str($address).unwrap()
    };
  }

  #[macro_export]
  macro_rules! u256 {
    ($string: expr) => {{
      {
        U256::from_str($string).unwrap()
      }
    }};
  }

  pub use addr;
  pub use u256;
}
