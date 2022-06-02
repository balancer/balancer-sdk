use ethcontract_generate::loaders::TruffleLoader;
use ethcontract_generate::ContractBuilder;
use std::path::Path;

fn make_contract_from_json(path: &str, name: &str) {
  println!("Building contract {} to {:#?}", path, name);

  // Prepare filesystem paths.
  let dest = Path::new("./src/generated_contracts/").join(format!("{}.rs", name));

  // Load a contract.
  let contract = TruffleLoader::new().load_contract_from_file(path).unwrap();

  // https://docs.rs/ethcontract-generate/0.17.0/ethcontract_generate/
  // Generate bindings for it.
  ContractBuilder::new()
    .visibility_modifier("pub")
    // It seems with large files, the formatting fails and you'll need to do it manually
    .rustfmt(false)
    .generate(&contract)
    .unwrap()
    .write_to_file(dest)
    .unwrap();
}

// ABIs from https://github.com/balancer-labs/balancer-subgraph-v2/tree/master/abis
fn main() {
  make_contract_from_json("./src/abis/SimpleTestContract.json", "simple_test_contract");
  make_contract_from_json("./src/abis/Vault.json", "vault");
  make_contract_from_json("./src/abis/WeightedPool.json", "weighted_pool");
  make_contract_from_json(
    "./src/abis/WeightedPool2Tokens.json",
    "weighted_pool_2_tokens",
  );
  make_contract_from_json("./src/abis/MetaStablePool.json", "meta_stable_pool");
  make_contract_from_json("./src/abis/StablePool.json", "stable_pool");
  make_contract_from_json("./src/abis/InvestmentPool.json", "managed_pool");
  make_contract_from_json(
    "./src/abis/LiquidityBootstrappingPool.json",
    "liquidity_bootstrapping_pool",
  );
}
