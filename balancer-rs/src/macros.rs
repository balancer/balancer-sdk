// NB: If you use these macros, remember that all dependencies have
// to be in scope where they are used.

#[macro_export]
macro_rules! addr {
  ($address: expr) => {
    ethcontract::Address::from_str($address).unwrap()
  };
}

#[macro_export]
macro_rules! u256 {
  ($string: expr) => {{
    {
      U256::from_dec_str($string).unwrap()
    }
  }};
}

#[macro_export]
macro_rules! swap_fee {
  ($string: expr) => {{
    {
      SwapFeePercentage($string).into()
    }
  }};
}
