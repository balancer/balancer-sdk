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
    pub const DAI_ADDRESS: &str = "0x04df6e4121c27713ed22341e7c7df330f56f289b";
    pub const WETH_ADDRESS: &str = "0xdfcea9088c8a88a76ff74892c1457c17dfeef9c1";

    // Arbitrary pools for examples
    pub const POOLS: [Pool; 3] = [
        Pool {
            pool_type: "Weighted",
            address: "0x0371c272fdd28ac13c434f1ef6b8b52ea3e6d844",
            id: "0x0371c272fdd28ac13c434f1ef6b8b52ea3e6d844000200000000000000000393",
            token_list: [BAL_ADDRESS, USDC_ADDRESS],
        },
        Pool {
            pool_type: "Weighted",
            address: "",
            id: "0x0cdab06b07197d96369fea6f3bea6efc7ecdf7090002000000000000000003de",
            token_list: [USDC_ADDRESS, DAI_ADDRESS],
        },
        Pool {
            pool_type: "Weighted",
            address: "0x02f67926005863df88ec7fb4ff521e6cd71f40d9",
            id: "0x0cdab06b07197d96369fea6f3bea6efc7ecdf7090002000000000000000003de",
            token_list: [WETH_ADDRESS, DAI_ADDRESS],
        },
    ];
}
