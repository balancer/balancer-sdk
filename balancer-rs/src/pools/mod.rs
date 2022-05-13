pub mod base_pool;

use web3::types::{Address, H256};

/**
 * Collection of helper methods not specific
 * to pool type. You can also use the BasePool directly.
 */
pub struct PoolService {
  pub web3: web3::Web3<web3::transports::Http>,
}
impl PoolService {
  pub fn new(web3: web3::Web3<web3::transports::Http>) -> PoolService {
    PoolService { web3: web3 }
  }

  pub async fn get_pool_id(&self, address: Address) -> H256 {
    let id: H256 = base_pool::BasePool::new(self.web3.clone(), address)
      .get_pool_id()
      .await;

    return id.clone();
  }
}
