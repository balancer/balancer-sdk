use super::super::generated_contracts::weighted_pool::WeightedPool as GeneratedWeightedPool;
use ethcontract::Address;

pub struct WeightedPool {}
impl WeightedPool {
  pub fn new(
    web3: ethcontract::Web3<ethcontract::web3::transports::Http>,
    pool_address: Address,
  ) -> GeneratedWeightedPool {
    return GeneratedWeightedPool::at(&web3, pool_address);
  }
}
