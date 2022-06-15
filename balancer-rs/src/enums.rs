/// General, MinimalSwapInfo, TwoToken,
#[derive(Copy, Clone, Debug)]
#[repr(u8)]
pub enum PoolSpecialization {
    General,
    MinimalSwapInfo,
    TwoToken,
}

/// GivenIn, GivenOut
#[derive(Copy, Clone, Debug)]
#[repr(u8)]
pub enum SwapKind {
    GivenIn,
    GivenOut,
}
