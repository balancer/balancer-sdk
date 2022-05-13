pub mod base_pool;

pub struct WeightedPool {
  pub web3: web3::Web3<web3::transports::Http>,
  pub pool_address: Address,
  pub contract: Contract<web3::transports::Http>,
  base_pool_instance: base_pool::BasePool
}
impl WeightedPool {
  pub fn new(web3: web3::Web3<web3::transports::Http>, pool_address: Address) -> PoolService {
    let web3c = web3.clone();
    let contract = Contract::from_json(
      web3.eth(),
      pool_address,
      include_bytes!("./abis/weighted_pool.json"),
    )
    .unwrap();

    let base_pool_instance = base_pool::BasePool.new(
      web3.eth(),
      pool_address,
    )

    WeightedPool {
      web3: web3c,
      pool_address,
      contract,
      base_pool_instance
    }
  }

  pub async fn get_pool_id(&self) -> H256 {
    let id: &H256 = &self
      .base_pool_instance
      .get_pool_id()
      .await
      .unwrap();

    return id.clone();
  }
}
