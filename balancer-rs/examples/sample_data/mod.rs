pub struct Pool {
  pub pool_type: &'static str,
  pub address: &'static str,
  pub id: &'static str,
  pub token_list: [&'static str; 2],
}

// Kovan sample data is from the subgraph:
// https://thegraph.com/hosted-service/subgraph/balancer-labs/balancer-kovan-v2
pub mod kovan {
  use super::*;

  pub const BAL_ADDRESS: &str = "0x41286bb1d3e870f3f750eb7e1c25d7e48c8a1ac7";
  pub const USDC_ADDRESS: &str = "0xc2569dd7d0fd715b054fbf16e75b001e5c0c1115";

  // Arbitrary pools for examples
  pub const POOLS: [Pool; 1] = [Pool {
    pool_type: "Weighted",
    address: "0x0371c272fdd28ac13c434f1ef6b8b52ea3e6d844",
    id: "0x0371c272fdd28ac13c434f1ef6b8b52ea3e6d844000200000000000000000393",
    token_list: [BAL_ADDRESS, USDC_ADDRESS],
  }];
}
