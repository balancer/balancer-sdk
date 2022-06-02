use ethcontract::tokens::{Bytes, Tokenize};
pub use ethcontract::U256;
use ethcontract_common::abi::Token::FixedBytes;

pub type IERC20 = ethcontract::Address;
pub type Address = ethcontract::Address;
pub type Bytes32 = ethcontract::Bytes<[u8; 32]>;

pub mod conversions;
pub mod swap_request;
pub use conversions::macros::*;
pub use swap_request::SwapRequest;

#[derive(Debug, Clone, Copy)]
pub struct HexString(pub &'static str);
impl HexString {
  pub fn to_str(&self) -> &str {
    self.0
  }
  pub fn to_bytes32(&self) -> Bytes32 {
    let hex_string = hexutil::read_hex(self.0);
    let bytes = FixedBytes(hex_string.unwrap());
    Bytes::from_token(bytes).unwrap()
  }
}
impl From<HexString> for Bytes32 {
  fn from(hex_string: HexString) -> Self {
    hex_string.to_bytes32()
  }
}
impl From<HexString> for ethcontract::tokens::Bytes<Vec<u8>> {
  fn from(hex_string: HexString) -> Self {
    let hex_string = hexutil::read_hex(hex_string.to_str()).unwrap();

    ethcontract::tokens::Bytes::<Vec<u8>>(hex_string)
  }
}

#[derive(Clone, Copy, Debug)]
pub struct PoolId(pub &'static str);
impl From<PoolId> for Bytes32 {
  fn from(pool_id: PoolId) -> Self {
    let bytes = hexutil::read_hex(pool_id.0);
    let bytes = bytes.unwrap();

    Bytes::from_token(FixedBytes(bytes)).unwrap()
  }
}

#[derive(Debug, Clone, Copy)]
pub struct UserData(pub &'static str);
impl From<UserData> for ethcontract::tokens::Bytes<Vec<u8>> {
  fn from(data: UserData) -> Self {
    let data = hexutil::read_hex(data.0).unwrap();
    ethcontract::tokens::Bytes::<Vec<u8>>(data)
  }
}

#[derive(Copy, Clone)]
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

type BatchSwapTuple = (
  ethcontract::tokens::Bytes<[u8; 32]>, // pool_id
  ethcontract::U256,                    // asset_in_index
  ethcontract::U256,                    // asset_out_index
  ethcontract::U256,                    // amount
  ethcontract::tokens::Bytes<Vec<u8>>,  // user_data
);

#[derive(Clone, Debug)]
pub struct BatchSwapStep {
  pub pool_id: Bytes32,
  pub asset_in_index: ethcontract::U256,
  pub asset_out_index: ethcontract::U256,
  pub amount: ethcontract::U256,
  pub user_data: ethcontract::tokens::Bytes<Vec<u8>>,
}
impl BatchSwapStep {
  /// Creates a new BatchSwapStep
  ///
  /// The new constructor allows for the BatchSwapStep to be easily instantiated
  /// from easy to read strings and numbers. The inputs will be converted to typesafe
  /// and type correct values.
  ///
  /// # Examples
  ///
  /// Basic usage:
  ///
  /// ```
  /// let swap_step = BatchSwapStep::new(pool_id, 0, 1, "1000", UserData("0x"));
  /// ```
  pub fn new(
    pool_id: PoolId,
    asset_in_index: i32,
    asset_out_index: i32,
    amount: &str,
    user_data: UserData,
  ) -> Self {
    BatchSwapStep {
      pool_id: pool_id.into(),
      asset_in_index: asset_in_index.into(),
      asset_out_index: asset_out_index.into(),
      amount: u256!(amount),
      user_data: user_data.into(),
    }
  }
}
/// Allows for conversion of a BatchSwapStep to a tuple
impl From<BatchSwapStep> for BatchSwapTuple {
  fn from(swap_step: BatchSwapStep) -> BatchSwapTuple {
    (
      swap_step.pool_id,
      swap_step.asset_in_index,
      swap_step.asset_out_index,
      swap_step.amount,
      swap_step.user_data,
    )
  }
}

type FundManagementTuple = (
  ethcontract::Address, // sender
  bool,                 // from_internal_balance
  ethcontract::Address, // recipient
  bool,                 // to_internal_balance
);
pub struct FundManagement {
  pub sender: ethcontract::Address,
  pub from_internal_balance: bool,
  pub recipient: ethcontract::Address,
  pub to_internal_balance: bool,
}
/// Allows for conversion of a BatchSwapStep to a tuple
impl From<FundManagement> for FundManagementTuple {
  fn from(funds: FundManagement) -> FundManagementTuple {
    (
      funds.sender,
      funds.from_internal_balance,
      funds.recipient,
      funds.to_internal_balance,
    )
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
