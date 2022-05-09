/**
 * Miscellaneous Methods
 * https://dev.balancer.fi/references/contracts/apis/the-vault#miscellaneous
 *
 * The tests also serve as functional examples
 */

#[cfg(test)]
mod tests {
  // Test to see if the module can get the WETH address from the vault
  #[actix_rt::test]
  async fn test_weth_async() {
    let web3 = balancer_rs::infura::build_web3();
    let vault = balancer_rs::Vault::new(web3);
    let weth_address = vault.weth().await;

    let address_str = web3::helpers::to_string(&weth_address);

    assert_eq!(
      snailquote::unescape(&address_str).unwrap(),
      "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2".to_string()
    );
  }
}
