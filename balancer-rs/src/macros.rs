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

/// Simple conversion from a string slice to an U256
#[macro_export]
macro_rules! u256 {
    ($string: expr) => {{
        {
            U256::from_dec_str($string).unwrap()
        }
    }};
}

/// Simple conversion from a string slice to an I256
#[macro_export]
macro_rules! i256 {
    ($string: expr) => {{
        {
            I256::from_dec_str($string).unwrap()
        }
    }};
}

// Simple conversion from a string slice to a [`SwapFeePercentage`]
#[macro_export]
macro_rules! swap_fee {
    ($string: expr) => {{
        {
            SwapFeePercentage($string).into()
        }
    }};
}
