use super::super::generated_contracts::weighted_pool::WeightedPool;
use ethcontract::Address;

/**
 * This will build a vault contract instance.
 **/
pub fn get_contract_instance(rpc_endpoint: &str, pool_address: Address) -> WeightedPool {
  let transport = ethcontract::web3::transports::Http::new(rpc_endpoint).unwrap();
  let web3 = ethcontract::Web3::new(transport);
  return WeightedPool::at(&web3, pool_address);
}
