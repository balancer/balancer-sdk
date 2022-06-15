use ethcontract::tokens::{Bytes, Tokenize};
use ethcontract::{H160, U256};
use ethcontract_common::abi::Token::FixedBytes;
use ethers_core::utils::parse_units;
pub use std::str::FromStr;

use crate::{u256, Address, Bytes32, SwapKind, IERC20};

#[derive(Clone, Copy, Debug)]
pub struct PoolId(pub Bytes32);
impl FromStr for PoolId {
    type Err = ethcontract::tokens::Error;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let bytes = hexutil::read_hex(s);
        let bytes = bytes.unwrap();
        let bytes = Bytes::from_token(FixedBytes(bytes))?;

        Ok(PoolId(bytes))
    }
}
impl From<PoolId> for Bytes32 {
    fn from(pool_id: PoolId) -> Self {
        pool_id.0
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

#[derive(Debug, Clone, Copy)]
pub struct SwapFeePercentage(pub &'static str);
impl From<SwapFeePercentage> for ethcontract::U256 {
    fn from(percentage: SwapFeePercentage) -> Self {
        let wei = parse_units(percentage.0, "wei").unwrap();
        U256::from_dec_str(&wei.to_string()).unwrap()
    }
}

/// The SingleSwapTuple es the data structure used by the contract interface.
/// This is what is created when calling single_swap_instance.into()
type SingleSwapTuple = (
    ethcontract::Bytes<[u8; 32]>,
    u8,
    H160,
    H160,
    U256,
    ethcontract::Bytes<Vec<u8>>,
);
/// The SingleSwap struct defines which pool we're trading with and what kind of swap we want to perform.
#[derive(Debug, Clone)]
pub struct SingleSwap {
    pub pool_id: PoolId,
    pub kind: SwapKind,
    pub asset_in: Address,
    pub asset_out: Address,
    pub amount: U256,
    pub user_data: ethcontract::tokens::Bytes<Vec<u8>>,
}
/// Allows for conversion of a BatchSwapStep to a tuple
impl From<SingleSwap> for SingleSwapTuple {
    fn from(swap: SingleSwap) -> SingleSwapTuple {
        (
            swap.pool_id.into(),
            swap.kind as u8,
            swap.asset_in,
            swap.asset_out,
            swap.amount,
            swap.user_data,
        )
    }
}

type BatchSwapTuple = (
    // pool_id
    ethcontract::tokens::Bytes<[u8; 32]>,
    // asset_in_index
    ethcontract::U256,
    // asset_out_index
    ethcontract::U256,
    // amount
    ethcontract::U256,
    // user_data
    ethcontract::tokens::Bytes<Vec<u8>>,
);

#[derive(Clone, Debug)]
pub struct BatchSwapStep {
    pub pool_id: PoolId,
    pub asset_in_index: ethcontract::U256,
    pub asset_out_index: ethcontract::U256,
    pub amount: ethcontract::U256,
    pub user_data: ethcontract::tokens::Bytes<Vec<u8>>,
}
impl BatchSwapStep {
    /// # Creates a new BatchSwapStep
    ///
    /// The new constructor allows for the BatchSwapStep to be easily instantiated
    /// from easy to read strings and numbers. The inputs will be converted to typesafe
    /// and type correct values.
    ///
    /// ## Examples
    ///
    /// Basic usage:
    ///
    /// ```
    /// use balancer_sdk::*;
    /// let pool_id = pool_id!("01abc00e86c7e258823b9a055fd62ca6cf61a16300010000000000000000003b");
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
            swap_step.pool_id.into(),
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
/// The FundManagement struct defines where the input tokens for the first swap are coming from and where any tokens received from swaps should be sent.
/// [See Balancer documentation](https://dev.balancer.fi/resources/swaps/batch-swaps#fundmanagement-struct)
pub struct FundManagement {
    /// The address from which tokens will be taken to perform the trade
    pub sender: ethcontract::Address,
    /// Whether the trade should use tokens owned by the sender which are already stored in the Vault.
    pub from_internal_balance: bool,
    /// The address to which tokens will be sent to after the trade.
    pub recipient: ethcontract::Address,
    /// Whether the tokens should be sent to the recipient or stored within their internal balance within the Vault.
    /// For more information on internal balances see [Core Concepts](https://dev.balancer.fi/resources/swaps/batch-swaps?q=%2F#:~:text=For%20more%20information%20on%20internal%20balances%20see%20Core%20Concepts.).
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
            kind as u8,
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

/// [See Balancer documentation](https://dev.balancer.fi/resources/joins-and-exits/pool-joins)
pub struct JoinPoolRequest {
    /// Sorted list of all tokens in pool
    pub assets: Vec<Address>,
    /// Maximum token send amounts
    pub max_amounts_in: Vec<U256>,
    /// Custom bytes field
    pub user_data: UserData,
    /// True if sending from internal token balances. False if sending ERC20.
    pub from_internal_balance: bool,
}
impl From<JoinPoolRequest>
    for (
        Vec<ethcontract::H160>,
        Vec<ethcontract::U256>,
        ethcontract::tokens::Bytes<Vec<u8>>,
        bool,
    )
{
    fn from(
        request: JoinPoolRequest,
    ) -> (
        Vec<ethcontract::H160>,
        Vec<ethcontract::U256>,
        ethcontract::tokens::Bytes<Vec<u8>>,
        bool,
    ) {
        let JoinPoolRequest {
            assets,
            max_amounts_in,
            user_data,
            from_internal_balance,
        } = request;
        (
            assets.into(),
            max_amounts_in,
            user_data.into(),
            from_internal_balance,
        )
    }
}

/// `https://dev.balancer.fi/resources/joins-and-exits/pool-exits#api`
pub struct ExitPoolRequest {
    /// List of your tokens, ordered
    pub assets: Vec<Address>,
    /// Minimum token receive amounts
    pub max_amounts_out: Vec<U256>,
    /// Custom bytes field
    pub user_data: UserData,
    /// True if you receiving tokens as internal token balances. False if receiving as ERC20.
    pub to_internal_balance: bool,
}
impl From<ExitPoolRequest>
    for (
        Vec<ethcontract::H160>,
        Vec<ethcontract::U256>,
        ethcontract::tokens::Bytes<Vec<u8>>,
        bool,
    )
{
    fn from(
        request: ExitPoolRequest,
    ) -> (
        Vec<ethcontract::H160>,
        Vec<ethcontract::U256>,
        ethcontract::tokens::Bytes<Vec<u8>>,
        bool,
    ) {
        let ExitPoolRequest {
            assets,
            max_amounts_out,
            user_data,
            to_internal_balance,
        } = request;
        (
            assets.into(),
            max_amounts_out,
            user_data.into(),
            to_internal_balance,
        )
    }
}
