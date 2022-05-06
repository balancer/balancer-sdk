#[cfg(test)]
mod tests {
  #[test]
  fn it_works() {
    assert_eq!(2 + 2, 4);
  }

  #[test]
  fn test_init() {
    let result = balancer_rs::vault::get_number();

    assert_eq!(result, 1);
  }
}
