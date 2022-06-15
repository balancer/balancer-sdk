extern crate ethcontract;

pub type IERC20 = crate::Address;
pub type Bytes32 = ethcontract::Bytes<[u8; 32]>;
pub type Web3 = ethcontract::Web3<ethcontract::web3::transports::Http>;
