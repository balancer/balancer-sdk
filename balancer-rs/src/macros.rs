// NB: If you use these macros, remember that all dependencies have
// to be in scope where they are used.

/// Simple conversion from a string slice to an Address
#[macro_export]
macro_rules! addr {
    ($address: expr) => {
        Address::from_str($address).unwrap()
    };
}

#[macro_export]
macro_rules! pool_id {
    ($id: expr) => {
        PoolId::from_str($id).unwrap()
    };
}

/// Simple conversion from various "numberish" types to a [`U256`](crate::U256).
///
/// Uses [`stringify`] to convert token to string before conversion.
#[macro_export]
macro_rules! u256 {
    ($t: tt) => {{
        {
            U256::from_dec_str(stringify!($t)).unwrap()
        }
    }};
}

/// Simple conversion from various "numberish" types to a [`I256`](crate::I256).
///
/// Uses [`stringify`] to convert token to string before conversion.
#[macro_export]
macro_rules! i256 {
    ($t: tt) => {{
        {
            I256::from_dec_str(stringify!($t)).unwrap()
        }
    }};
}

/// Simple conversion from various "numberish" types to a [`SwapFeePercentage`](crate::SwapFeePercentage).
///
/// Uses [`stringify`] to convert token to string before conversion.
#[macro_export]
macro_rules! swap_fee {
    ($t: tt) => {{
        {
            SwapFeePercentage::from_str(stringify!($t)).unwrap()
        }
    }};
}
