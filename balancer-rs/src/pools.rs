//! Defines the pool structs and their methods.
//!
//! # Pools
//!
//! NB: Many Pool operations are done via the [`Vault`](crate::vault)!.
//!
//! # Basic Usage
//!
//! ## Create Weighted Pool instance
//! ```rust
//! use balancer_sdk::pools::WeightedPool;
//! use balancer_sdk::*;
//!
//! const RPC_URL: &str = "https://rpc.flashbots.net/";
//! const POOL_ADDRESS: &str = "0x01abc00e86c7e258823b9a055fd62ca6cf61a163";
//! let transport = ethcontract::web3::transports::Http::new(RPC_URL).unwrap();
//! let web3 = ethcontract::Web3::new(transport);
//!
//! let pool_instance = WeightedPool::new(web3, addr!(POOL_ADDRESS));
//! ```
//!
//! ## Domain specific structs, enums, macros
//! Some of the examples below use "helper" structs, enums, macros, etc. from this crate taken from the Balancer domain.
//! Here are a few for easy reference:
//!
//! - [`addr!` macro](crate::addr)
//! - [`swap_fee!` macro](crate::swap_fee)
//! - [`pool_id!` macro](crate::pool_id)
//! - [`UserData`](crate::UserData)
//!
//!
//! ## Examples
//! ## Pools Methods - Base Pool
//! [See Balancer's Pool API documentation](https://dev.balancer.fi/references/contracts/apis/pools)
//!
//! Since all pools share a base API, we can use the Weighted Pool for the examples below
//!
//! #### get_vault()
//! Returns pool's Vault.
//!
//! [See Balancer documentation](https://dev.balancer.fi/references/contracts/apis/pools#getvault)
//!
//! ```no_run
//! use balancer_sdk::pools::WeightedPool;
//! use balancer_sdk::*;
//! # use balancer_sdk::helpers::*;
//!
//! # tokio_test::block_on(async {
//! # let web3 = build_web3(&get_env_var("RPC_URL"));
//! let pool_address: &str = "0x01abc00e86c7e258823b9a055fd62ca6cf61a163";
//! let pool_instance = WeightedPool::new(web3, addr!(pool_address));
//! let vault_address = pool_instance.get_vault()
//!     .call()
//!     .await
//!     .unwrap();
//! # });
//! ```
//! #### get_pool_id()
//! Returns pool's poolId.
//!
//! [See Balancer documentation](https://dev.balancer.fi/references/contracts/apis/pools#getpoolid)
//!
//! ```no_run
//! use balancer_sdk::pools::WeightedPool;
//! use balancer_sdk::*;
//! # use balancer_sdk::helpers::*;
//!
//! # tokio_test::block_on(async {
//! # let web3 = build_web3(&get_env_var("RPC_URL"));
//! let pool_address: &str = "0x01abc00e86c7e258823b9a055fd62ca6cf61a163";
//! let pool_instance = WeightedPool::new(web3, addr!(pool_address));
//! let vault_address = pool_instance.get_pool_id()
//!     .call()
//!     .await
//!     .unwrap();
//! # });
//! ```
//! #### get_swap_fee_percentage()
//! Returns the pool's current swap fee.
//!
//! [See Balancer documentation](https://dev.balancer.fi/references/contracts/apis/pools#getSwapFeePercentage)
//!
//! ```no_run
//! use balancer_sdk::pools::WeightedPool;
//! use balancer_sdk::*;
//! # use balancer_sdk::helpers::*;
//!
//! # tokio_test::block_on(async {
//! # let web3 = build_web3(&get_env_var("RPC_URL"));
//! let pool_address: &str = "0x01abc00e86c7e258823b9a055fd62ca6cf61a163";
//! let pool_instance = WeightedPool::new(web3, addr!(pool_address));
//! let vault_address = pool_instance.get_swap_fee_percentage()
//!     .call()
//!     .await
//!     .unwrap();
//! # });
//! ```
//! #### set_swap_fee_percentage()
//! Returns the pool's current swap fee.
//!
//! [See Balancer documentation](https://dev.balancer.fi/references/contracts/apis/pools#setSwapFeePercentage)
//!
//! ```no_run
//! use balancer_sdk::pools::WeightedPool;
//! use balancer_sdk::*;
//! # use balancer_sdk::helpers::*;
//!
//! # tokio_test::block_on(async {
//! # let web3 = build_web3(&get_env_var("RPC_URL"));
//! let pool_address: &str = "0x01abc00e86c7e258823b9a055fd62ca6cf61a163";
//! let pool_instance = WeightedPool::new(web3, addr!(pool_address));
//! let vault_address = pool_instance.set_swap_fee_percentage(
//!     swap_fee!(0.10).into()
//!    )
//!     .send()
//!     .await
//!     .unwrap();
//! # });
//! ```
//! #### get_normalized_weights()
//! [See interface](struct.WeightedPool.html#method.get_normalized_weights)
//! Returns the pool's token weights.
//!
//! [See Balancer documentation](https://dev.balancer.fi/resources/pool-interfacing/weighted-pool#getting-pool-data)
//!
//! ```no_run
//! use balancer_sdk::pools::WeightedPool;
//! use balancer_sdk::*;
//! # use balancer_sdk::helpers::*;
//!
//! # tokio_test::block_on(async {
//! # let web3 = build_web3(&get_env_var("RPC_URL"));
//! let pool_address: &str = "0x01abc00e86c7e258823b9a055fd62ca6cf61a163";
//! let pool_instance = WeightedPool::new(web3, addr!(pool_address));
//! let weights: Vec<U256> = pool_instance.get_normalized_weights()
//!     .call()
//!     .await
//!     .unwrap();
//! # });
//! ```
//! #### set_paused()
//! [See interface](struct.WeightedPool.html#method.set_paused)
//!
//! Pauses trading within the pool. Users can exit their positions proportionally.
//!
//! Note: This can only be called by an authorized account and is intended to be used only as an emergency stop if something goes wrong.
//!
//! [See Balancer documentation](https://dev.balancer.fi/references/contracts/apis/pools#setpaused)
//!
//! ```no_run
//! use balancer_sdk::pools::WeightedPool;
//! use balancer_sdk::*;
//! # use balancer_sdk::helpers::*;
//!
//! # tokio_test::block_on(async {
//! # let web3 = build_web3(&get_env_var("RPC_URL"));
//! let pool_address: &str = "0x01abc00e86c7e258823b9a055fd62ca6cf61a163";
//! let pool_instance = WeightedPool::new(web3, addr!(pool_address));
//! let vault_address = pool_instance.set_paused(true)
//!     .send()
//!     .await
//!     .unwrap();
//! # });
//! ```
//! #### on_swap()
//! [See interface](struct.WeightedPool.html#method.on_swap)
//!
//! When the Vault is handling a swap, it will call onSwap to ask the pool what the amounts should be. Pools that use weighted math only need the input/output tokens to determine price.
//!
//! [See Balancer documentation](https://dev.balancer.fi/references/contracts/apis/pools/weightedpool#onswap)
//!
//!
//! ```no_run
//! use balancer_sdk::pools::WeightedPool;
//! use balancer_sdk::*;
//! # use balancer_sdk::helpers::*;
//!
//! # tokio_test::block_on(async {
//! # let web3 = build_web3(&get_env_var("RPC_URL"));
//! let pool_address: &str = "0x01abc00e86c7e258823b9a055fd62ca6cf61a163";
//! let pool_instance = WeightedPool::new(web3, addr!(pool_address));
//! let swap_request = SwapRequest {
//!     kind: SwapKind::GivenIn,
//!     token_in: addr!("0x0"),
//!     token_out: addr!("0x0"),
//!     amount: u256!(0),
//!     pool_id: pool_id!("0x0"),
//!     last_change_block: u256!(12),
//!     from: addr!("0x0"),
//!     to: addr!("0x0"),
//!     user_data: UserData("0x")
//! };
//! let balance_token_in = u256!(123);
//! let balance_token_out = u256!(123);
//!
//! let amount_out = pool_instance
//!     .on_swap(
//!         swap_request.into(),
//!         balance_token_in,
//!         balance_token_out,
//!     )
//!     .call()
//!     .await
//!     .unwrap();
//! # });
//! ```
//! ## Pools Methods - Weighted2PoolTokens
//! [See Balancer's Pool API documentation](https://dev.balancer.fi/references/contracts/apis/pools/weightedpool2tokens)
//!
//! ### on_swap()
//! See Base Pool Methods above
//!
//! #### enable_oracle()
//! [See interface](struct.Weighted2PoolTokens.html#method.enable_oracle)
//!
//! Enables the oracle functionality.
//!
//! [See Balancer documentation](https://dev.balancer.fi/references/contracts/apis/pools/weightedpool2tokensenableoracle)
//!
//! ```no_run
//! use balancer_sdk::pools::WeightedPool2Tokens;
//! use balancer_sdk::*;
//! # use balancer_sdk::helpers::*;
//!
//! # tokio_test::block_on(async {
//! # let web3 = build_web3(&get_env_var("RPC_URL"));
//! let pool_address: &str = "0x01abc00e86c7e258823b9a055fd62ca6cf61a163";
//! let pool_instance = WeightedPool2Tokens::new(web3, addr!(pool_address));
//!
//! pool_instance.enable_oracle()
//!     .call()
//!     .await
//!     .unwrap();
//! # });
//! ```
//! #### get_misc_data()
//! [See interface](struct.Weighted2PoolTokens.html#method.get_misc_data)
//!
//! Returns a variety of data fields:
//!
//! ```solidity
//! getMiscData()
//! returns (
//!   int256 logInvariant,
//!   int256 logTotalSupply,
//!   uint256 oracleSampleCreationTimestamp,
//!   uint256 oracleIndex,
//!   bool oracleEnabled,
//!   uint256 swapFeePercentage)
//! ```
//!
//! [See Balancer documentation](https://dev.balancer.fi/references/contracts/apis/pools/weightedpool2tokensgetMiscData)
//!
//! ```no_run
//! use balancer_sdk::pools::WeightedPool2Tokens;
//! use balancer_sdk::*;
//! # use balancer_sdk::helpers::*;
//!
//! # tokio_test::block_on(async {
//! # let web3 = build_web3(&get_env_var("RPC_URL"));
//! let pool_address: &str = "0x01abc00e86c7e258823b9a055fd62ca6cf61a163";
//! let pool_instance = WeightedPool2Tokens::new(web3, addr!(pool_address));
//!
//! let misc_data = pool_instance.get_misc_data()
//!     .call()
//!     .await
//!     .unwrap();
//! # });
//! ```
//! #### get_largest_safe_query_window()
//! [See interface](struct.Weighted2PoolTokens.html#method.get_largest_safe_query_window)
//!
//! Returns largest safe query window.
//!
//! [See Balancer documentation](https://dev.balancer.fi/references/contracts/apis/pools/weightedpool2tokensgetLargestSafeQueryWindow)
//!
//! ```no_run
//! use balancer_sdk::pools::WeightedPool2Tokens;
//! use balancer_sdk::*;
//! # use balancer_sdk::helpers::*;
//!
//! # tokio_test::block_on(async {
//! # let web3 = build_web3(&get_env_var("RPC_URL"));
//! let pool_address: &str = "0x01abc00e86c7e258823b9a055fd62ca6cf61a163";
//! let pool_instance = WeightedPool2Tokens::new(web3, addr!(pool_address));
//!
//! let misc_data = pool_instance.get_largest_safe_query_window()
//!     .call()
//!     .await
//!     .unwrap();
//! # });
//! ```
//! #### get_latest()
//! [See interface](struct.Weighted2PoolTokens.html#method.get_latest)
//!
//! Returns latest pair price, BPT price, or invariant depending on what variable enum you pass. Samples are recorded by the pool as calculated with the pre-operation balances. For example, the spot price before a swap is the value stored as the most recent PAIR_PRICE.
//!
//! [See Balancer documentation](https://dev.balancer.fi/references/contracts/apis/pools/weightedpool2tokens#getlatest)
//!
//! Uses [`Variable`](crate::Variable) enum
//!
//! ```no_run
//! use balancer_sdk::pools::WeightedPool2Tokens;
//! use balancer_sdk::*;
//! # use balancer_sdk::helpers::*;
//!
//! # tokio_test::block_on(async {
//! # let web3 = build_web3(&get_env_var("RPC_URL"));
//! let pool_address: &str = "0x01abc00e86c7e258823b9a055fd62ca6cf61a163";
//! let pool_instance = WeightedPool2Tokens::new(web3, addr!(pool_address));
//!
//! let misc_data = pool_instance.get_latest(Variable::PairPrice as u8)
//!     .call()
//!     .await
//!     .unwrap();
//! # });
//! ```
//! #### get_time_weighted_average()
//! [See interface](struct.Weighted2PoolTokens.html#method.get_time_weighted_average)
//!
//! Returns time weighted average prices corresponding to the variables in each query. secs is the duration of the query in seconds, and ago is the time in seconds from since end of that duration. Prices are represented as 18 decimal fixed point values.
//! > **Note**
//! > Note that you can only call getTimeWeightedAverage after the buffer is full, or it will revert with ORACLE_NOT_INITIALIZED. If you call getSample(1023) and it returns 0's, that means the buffer's not full yet.
//!
//! [See Balancer documentation](https://dev.balancer.fi/references/contracts/apis/pools/weightedpool2tokens#getTimeWeightedAverage)
//!
//! Uses [`Variable`](crate::Variable) enum
//! Uses [`OracleAverageQuery`](crate::OracleAverageQuery) struct
//!
//! ```no_run
//! use balancer_sdk::pools::WeightedPool2Tokens;
//! use balancer_sdk::*;
//! # use balancer_sdk::helpers::*;
//!
//! # tokio_test::block_on(async {
//! # let web3 = build_web3(&get_env_var("RPC_URL"));
//! let pool_address: &str = "0x01abc00e86c7e258823b9a055fd62ca6cf61a163";
//! let pool_instance = WeightedPool2Tokens::new(web3, addr!(pool_address));
//! let query = OracleAverageQuery {
//!     variable: Variable::PairPrice,
//!     secs: u256!(10000),
//!     ago: u256!(1234),
//! };
//!
//! let misc_data = pool_instance.get_time_weighted_average(vec![query.into()])
//!     .call()
//!     .await
//!     .unwrap();
//! # });
//! ```
//! #### get_past_accumulators()
//! [See interface](struct.Weighted2PoolTokens.html#method.get_past_accumulators)
//!
//! Returns estimates for the accumulator at a time ago seconds ago for each query.
//!
//! [See Balancer documentation](https://dev.balancer.fi/references/contracts/apis/pools/weightedpool2tokens#getPastAccumulators)
//!
//! Uses [`Variable`](crate::Variable) enum
//! Uses [`OracleAccumulatorQuery`](crate::OracleAccumulatorQuery) struct
//!
//! ```no_run
//! use balancer_sdk::pools::WeightedPool2Tokens;
//! use balancer_sdk::*;
//! # use balancer_sdk::helpers::*;
//!
//! # tokio_test::block_on(async {
//! # let web3 = build_web3(&get_env_var("RPC_URL"));
//! let pool_address: &str = "0x01abc00e86c7e258823b9a055fd62ca6cf61a163";
//! let pool_instance = WeightedPool2Tokens::new(web3, addr!(pool_address));
//! let query = OracleAccumulatorQuery {
//!     variable: Variable::PairPrice,
//!     ago: u256!(1234),
//! };
//!
//! let misc_data = pool_instance.get_past_accumulators(vec![query.into()])
//!     .call()
//!     .await
//!     .unwrap();
//! # });
//! ```
//! ## Pools Methods - LiquidityBootstrappingPool
//! [See Balancer's Pool API documentation](https://dev.balancer.fi/references/contracts/apis/pools/LiquidityBootstrappingPool)
//!
//! ### on_swap()
//! See Base Pool Methods above
//!
//! #### get_swap_enabled()
//! [See interface](struct.LiquidityBootstrappingPool.html#method.get_swap_enabled)
//!
//! Returns True if the pool has swaps enabled.
//!
//! [See Balancer documentation](https://dev.balancer.fi/references/contracts/apis/pools/LiquidityBootstrappingPool#getswapenabled)
//!
//! ```no_run
//! use balancer_sdk::pools::LiquidityBootstrappingPool;
//! use balancer_sdk::*;
//! # use balancer_sdk::helpers::*;
//!
//! # tokio_test::block_on(async {
//! # let web3 = build_web3(&get_env_var("RPC_URL"));
//! let pool_address: &str = "0x0";
//! let pool_instance = LiquidityBootstrappingPool::new(web3, addr!(pool_address));
//!
//! pool_instance.get_swap_enabled()
//!     .call()
//!     .await
//!     .unwrap();
//! # });
//! ```
//! #### get_gradual_weight_update_params()
//! [See interface](struct.LiquidityBootstrappingPool.html#method.get_gradual_weight_update_params)
//!
//! Return start time, end time, and endWeights as an array. Current weights should be retrieved via [get_normalized_weights](struct.WeightedPool.html#method.get_normalized_weights).
//!
//! [See Balancer documentation](https://dev.balancer.fi/references/contracts/apis/pools/LiquidityBootstrappingPool#getGradualWeightUpdateParams)
//!
//! ```no_run
//! use balancer_sdk::pools::LiquidityBootstrappingPool;
//! use balancer_sdk::*;
//! # use balancer_sdk::helpers::*;
//!
//! # tokio_test::block_on(async {
//! # let web3 = build_web3(&get_env_var("RPC_URL"));
//! let pool_address: &str = "0x0";
//! let pool_instance = LiquidityBootstrappingPool::new(web3, addr!(pool_address));
//!
//! let (start_time, end_time, end_weights) = pool_instance
//!     .get_gradual_weight_update_params()
//!     .call()
//!     .await
//!     .unwrap();
//! # });
//! ```
//!
//! ### Permissioned Functions
//! All of the following functions are only callable by the pool owner.
//!
//! #### set_swap_enabled()
//! [See interface](struct.LiquidityBootstrappingPool.html#method.set_swap_enabled)
//!
//! Enables swaps if passed True, disables them if passed False.
//!
//! [See Balancer documentation](https://dev.balancer.fi/references/contracts/apis/pools/LiquidityBootstrappingPool#setSwapEnabled)
//!
//! ```no_run
//! use balancer_sdk::pools::LiquidityBootstrappingPool;
//! use balancer_sdk::*;
//! # use balancer_sdk::helpers::*;
//!
//! # tokio_test::block_on(async {
//! # let web3 = build_web3(&get_env_var("RPC_URL"));
//! let pool_address: &str = "0x0";
//! let pool_instance = LiquidityBootstrappingPool::new(web3, addr!(pool_address));
//!
//! pool_instance
//!     .set_swap_enabled(true)
//!     .send()
//!     .await
//!     .unwrap();
//! # });
//! ```
//! #### update_weights_gradually()
//! [See interface](struct.LiquidityBootstrappingPool.html#method.update_weights_gradually)
//!
//! Schedule a gradual weight change, from the current weights to the given endWeights, from startTime to endTime.
//!
//! [See Balancer documentation](https://dev.balancer.fi/references/contracts/apis/pools/LiquidityBootstrappingPool#updateWeightsGradually)
//!
//! ```no_run
//! use balancer_sdk::pools::LiquidityBootstrappingPool;
//! use balancer_sdk::*;
//! # use balancer_sdk::helpers::*;
//!
//! # tokio_test::block_on(async {
//! # let web3 = build_web3(&get_env_var("RPC_URL"));
//! let pool_address: &str = "0x0";
//! let pool_instance = LiquidityBootstrappingPool::new(web3, addr!(pool_address));
//! let start_time = u256!(0);
//! let end_time = u256!(1);
//! let end_weights = vec![u256!(0.1), u256!(0.1), u256!(0.8)];
//!
//! pool_instance.update_weights_gradually(start_time, end_time, end_weights)
//!     .send()
//!     .await
//!     .unwrap();
//! # });
//! ```

pub use crate::generated_contracts::*;
pub use liquidity_bootstrapping_pool::LiquidityBootstrappingPool;
pub use managed_pool::ManagedPool;
pub use meta_stable_pool::MetaStablePool;
pub use stable_pool::StablePool;
pub use weighted_pool::WeightedPool;
pub use weighted_pool_2_tokens::WeightedPool2Tokens;

use ethcontract::Address;

macro_rules! define_contract {
    ($name:ident) => {
        impl $name {
            pub fn new(
                web3: ethcontract::Web3<ethcontract::web3::transports::Http>,
                pool_address: Address,
            ) -> Self {
                $name::at(&web3, pool_address)
            }
        }
    };
}

define_contract!(WeightedPool);
define_contract!(WeightedPool2Tokens);
define_contract!(LiquidityBootstrappingPool);
define_contract!(ManagedPool);
define_contract!(MetaStablePool);
define_contract!(StablePool);

#[cfg(test)]
pub mod tests {
    // Note this useful idiom: importing names from outer (for mod tests) scope.
    use super::*;
    use std::str::FromStr;

    macro_rules! test_pool_instatiation {
        ($pool:tt) => {{
            const RPC_URL: &'static str = "https://rpc.flashbots.net/";
            const POOL_ADDRESS: &'static str = "0x01abc00e86c7e258823b9a055fd62ca6cf61a163";

            let transport = ethcontract::web3::transports::Http::new(RPC_URL).unwrap();
            let web3 = ethcontract::Web3::new(transport);
            let pool_address = crate::addr!(POOL_ADDRESS);

            $pool::new(web3, pool_address);
        }};
    }

    #[test]
    fn test_instantiate_pools() {
        test_pool_instatiation!(WeightedPool);
        test_pool_instatiation!(WeightedPool2Tokens);
        test_pool_instatiation!(LiquidityBootstrappingPool);
        test_pool_instatiation!(ManagedPool);
        test_pool_instatiation!(StablePool);
        test_pool_instatiation!(MetaStablePool);
    }
}
