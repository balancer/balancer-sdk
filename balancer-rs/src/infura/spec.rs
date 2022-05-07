mod infura;

#[cfg(test)]
mod tests {
  #[test]
  fn test_build_endpoint() {
    let url = infura::build_endpoint();

    assert_eq!(
      url,
      "https://mainnet.infura.io/v3/dc9c54ff35694b40b314c420d6244bf6"
    );
  }
}
