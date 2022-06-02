//! Defines the pool structs and their methods.

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
