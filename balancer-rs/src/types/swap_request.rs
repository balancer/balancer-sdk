use ethcontract::U256;

use super::*;

pub struct SwapRequest {
  pub kind: SwapKind,
  pub token_in: IERC20,
  pub token_out: IERC20,
  pub amount: U256,

  // Misc data
  pub pool_id: Bytes32,
  pub last_change_block: U256,
  pub from: Address,
  pub to: Address,
  pub user_data: ethcontract::tokens::Bytes<Vec<u8>>,
}
impl From<SwapRequest>
  for (
    u8,
    ethcontract::H160,
    ethcontract::H160,
    ethcontract::U256,
    ethcontract::Bytes<[u8; 32]>,
    ethcontract::U256,
    ethcontract::H160,
    ethcontract::H160,
    ethcontract::Bytes<std::vec::Vec<u8>>,
  )
{
  fn from(
    swap_request: SwapRequest,
  ) -> (
    u8,
    ethcontract::H160,
    ethcontract::H160,
    ethcontract::U256,
    ethcontract::Bytes<[u8; 32]>,
    ethcontract::U256,
    ethcontract::H160,
    ethcontract::H160,
    ethcontract::Bytes<std::vec::Vec<u8>>,
  ) {
    let SwapRequest {
      kind,
      token_in,
      token_out,
      amount,
      pool_id,
      last_change_block,
      from,
      to,
      user_data,
    } = swap_request;
    (
      kind.into(),
      token_in,
      token_out,
      amount,
      pool_id,
      last_change_block,
      from,
      to,
      user_data,
    )
  }
}
