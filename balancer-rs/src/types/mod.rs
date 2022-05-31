use ethcontract::tokens::{Bytes, Tokenize};
use ethcontract_common::abi::Token::FixedBytes;

pub type IERC20 = ethcontract::Address;
pub type Address = ethcontract::Address;
pub type Bytes32 = ethcontract::Bytes<[u8; 32]>;

pub mod conversions;
pub mod swap_request;
pub use conversions::macros::*;
pub use swap_request::SwapRequest;

pub struct HexString(pub &'static str);
impl HexString {
  pub fn to_str(&self) -> &str {
    self.0
  }
  pub fn to_bytes32(&self) -> Bytes32 {
    let hex_string = hexutil::read_hex(&self.0);
    let bytes = FixedBytes(hex_string.unwrap());
    let result = Bytes::from_token(bytes).unwrap();

    return result;
  }
}
impl From<HexString> for Bytes32 {
  fn from(hex_string: HexString) -> Self {
    return hex_string.to_bytes32();
  }
}
impl From<HexString> for ethcontract::tokens::Bytes<Vec<u8>> {
  fn from(hex_string: HexString) -> Self {
    let hex_string = hexutil::read_hex(hex_string.to_str()).unwrap();
    return ethcontract::tokens::Bytes::<Vec<u8>>(hex_string);
  }
}

pub struct PoolId(pub &'static str);
impl From<PoolId> for Bytes32 {
  fn from(pool_id: PoolId) -> Self {
    let bytes = hexutil::read_hex(&pool_id.0);
    let bytes = bytes.unwrap();
    let bytes = Bytes::from_token(FixedBytes(bytes)).unwrap();

    return bytes;
  }
}

pub struct UserData(pub &'static str);
impl From<UserData> for ethcontract::tokens::Bytes<Vec<u8>> {
  fn from(data: UserData) -> Self {
    let data = hexutil::read_hex(&data.0).unwrap();
    return ethcontract::tokens::Bytes::<Vec<u8>>(data);
  }
}

#[repr(u8)]
pub enum SwapKind {
  GivenIn,
  GivenOut,
}
impl From<SwapKind> for u8 {
  fn from(swap_kind: SwapKind) -> u8 {
    match swap_kind {
      SwapKind::GivenIn => 0,
      SwapKind::GivenOut => 1,
    }
  }
}

#[cfg(test)]
pub mod tests {
  // Note this useful idiom: importing names from outer (for mod tests) scope.
  use super::*;

  #[test]
  fn test_hex_string_to_bytes32() {
    let pool_id = "0x32296969ef14eb0c6d29669c550d4a0449130230000200000000000000000080";
    let data = HexString(pool_id).to_bytes32();

    assert_eq!(
      Bytes([
        50, 41, 105, 105, 239, 20, 235, 12, 109, 41, 102, 156, 85, 13, 74, 4, 73, 19, 2, 48, 0, 2,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 128,
      ]),
      data
    );
  }
}
