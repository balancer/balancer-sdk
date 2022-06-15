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
//! let weighted_pool_instance = WeightedPool::new(web3, addr!(POOL_ADDRESS));
//! ```
//!
//! ## Domain specific structs, enums, macros
//! Some of the examples below use "helper" structs, enums, macros, etc. from this crate taken from the Balancer domain.
//! Here are a few for easy reference:
//!
//! - [`addr!` macro](crate::addr)
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
//! let weighted_pool_instance = WeightedPool::new(web3, addr!(pool_address));
//! let vault_address = weighted_pool_instance.get_vault()
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
//! let weighted_pool_instance = WeightedPool::new(web3, addr!(pool_address));
//! let vault_address = weighted_pool_instance.get_pool_id()
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
//! let weighted_pool_instance = WeightedPool::new(web3, addr!(pool_address));
//! let vault_address = weighted_pool_instance.get_swap_fee_percentage()
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
//! let weighted_pool_instance = WeightedPool::new(web3, addr!(pool_address));
//! let vault_address = weighted_pool_instance.set_swap_fee_percentage(
//!     u256!('10')
//!    )
//!     .send()
//!     .await
//!     .unwrap();
//! # });
//! ```

pub use crate::generated_contracts::*;
pub use liquidity_bootstrapping_pool::LiquidityBootStrappingPool;
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

// define_contract!(WeightedPool, GeneratedWeightedPool);
define_contract!(LiquidityBootStrappingPool);
define_contract!(MetaStablePool);
define_contract!(StablePool);
define_contract!(ManagedPool);
define_contract!(WeightedPool2Tokens);
define_contract!(WeightedPool);

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
        test_pool_instatiation!(LiquidityBootStrappingPool);
        test_pool_instatiation!(ManagedPool);
        test_pool_instatiation!(StablePool);
        test_pool_instatiation!(MetaStablePool);
    }
}
