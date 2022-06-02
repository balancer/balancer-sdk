//! # Balancer Rust SDK
//!
//! The Balancer Rust SDK is a Rust library that wraps provides a high-level API to interact with Balancer contracts.
//!
//! ## Typed API interfaces
//!
//! The contract APIs are generated from json files in the `src/abis` directory. To view the typed apis,
//! you will need to look at the generated contracts directly (see section: `Methods from Deref<Target = Methods>`):`
//!
//! - Vault API: [`generated_contracts::vault::vault::Contract`]

pub mod constants;
pub mod generated_contracts;
pub mod helpers;
pub mod pools;
pub mod types;
pub mod vault;
