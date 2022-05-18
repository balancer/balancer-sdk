use web3::contract::{Contract, Options};
use web3::types::{Address, H256};

pub struct BasePool {
  pub web3: web3::Web3<web3::transports::Http>,
  pub pool_address: Address,
  pub contract: Contract<web3::transports::Http>,
}
impl BasePool {
  pub fn new(web3: web3::Web3<web3::transports::Http>, pool_address: Address) -> BasePool {
    let web3c = web3.clone();

    let contract = Contract::from_json(
      web3.eth(),
      pool_address,
      // We can use this for the base pool abi
      include_bytes!("../abis/WeightedPool.json"),
    )
    .unwrap();

    BasePool {
      web3: web3c,
      pool_address,
      contract,
    }
  }

  pub async fn get_pool_id(&self) -> H256 {
    let id: &H256 = &self
      .contract
      .query("getPoolId", (), None, Options::default(), None)
      .await
      .unwrap();

    return id.clone();
  }
}
