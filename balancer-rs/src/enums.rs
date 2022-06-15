#[derive(Copy, Clone, Debug)]
#[repr(u8)]
pub enum PoolSpecialization {
    General,
    MinimalSwapInfo,
    TwoToken,
}

#[derive(Copy, Clone, Debug)]
#[repr(u8)]
pub enum SwapKind {
    GivenIn,
    GivenOut,
}

#[derive(Copy, Clone, Debug)]
#[repr(u8)]
pub enum PoolBalanceOpKind {
    Withdraw,
    Deposit,
    Update,
}

#[derive(Copy, Clone, Debug)]
#[repr(u8)]
pub enum Variable {
    PairPrice,
    BptPrice,
    Invariant,
}
