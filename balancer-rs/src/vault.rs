//! Defines the vault struct and its methods.
//!
//! # What is the Vault?
//! It is a single contract that holds and manages all the assets added by all Balancer pools. This allows Balancer to take full advantage of its multi-pool trading routing in order to offer the best trade routing options.
//! ## How does the Vault work?
//! Balancer V2 separates the Automated Market Maker (AMM) logic from the token management and accounting. Token management/accounting is done by the Vault while the AMM logic is individual to each pool.
//! Because pools are contracts external to the Vault, they can implement any arbitrary, customized AMM logic.
//!
//! # Basic Usage
//!
//! ## Create instance
//! ```rust
//! use balancer_sdk::vault::Vault;
//!
//! const RPC_URL: &str = balancer_sdk::constants::rpc_endpoints::KOVAN_TESTNET;
//! let transport = ethcontract::web3::transports::Http::new(RPC_URL).unwrap();
//! let web3 = ethcontract::Web3::new(transport);
//!
//! Vault::new(web3);
//! ```
//!
//! # Vault Methods
//! [See Balancer's Vault API documentation](https://dev.balancer.fi/references/contracts/apis/the-vault#getauthorizer)
//!
//! ## Authorization
//! #### get_authorizer()
//! Returns the Vault's Authorizer (Balancer governance contract).
//!
//! [See Balancer documentation](https://dev.balancer.fi/references/contracts/apis/the-vault#getauthorizer)
//!
//! ```no_run
//! use balancer_sdk::vault::Vault;
//! # use balancer_sdk::helpers::*;
//!
//! # tokio_test::block_on(async {
//! # let web3 = build_web3(&get_env_var("RPC_URL"));
//! Vault::new(web3).get_authorizer().call().await.unwrap()
//! # });
//! ```
//! #### set_authorizer()
//! Sets a new Authorizer for the Vault. The caller must be allowed by the current Authorizer to do this.
//!
//! [See Balancer documentation](https://dev.balancer.fi/references/contracts/apis/the-vault#setauthorizer)
//! ```no_run
//! use balancer_sdk::vault::Vault;
//! use balancer_sdk::*;
//! # use balancer_sdk::helpers::*;
//!
//! # tokio_test::block_on(async {
//! # let web3 = build_web3(&get_env_var("RPC_URL"));
//! let authorizer_address = addr!("0xBA12222222228d8Ba445958a75a0704d566BF2C8");
//! Vault::new(web3).set_authorizer(authorizer_address).call().await.unwrap()
//! # });
//! ```
//! #### has_approved_relayer()
//! Returns true if `user` has allowed relayer to act as a `relayer` for them.
//!
//! [See Balancer documentation](https://dev.balancer.fi/references/contracts/apis/the-vault#hasapprovedrelayer)
//! ```no_run
//! use balancer_sdk::vault::Vault;
//! use balancer_sdk::*;
//! # use balancer_sdk::helpers::*;
//!
//! # tokio_test::block_on(async {
//! # let web3 = build_web3(&get_env_var("RPC_URL"));
//! let some_user_address = addr!("0xBA12222222228d8Ba445958a75a0704d566BF2C8");
//! let some_relayer_address = addr!("0xBA12222222228d8Ba445958a75a0704d566BF2C8");
//! Vault::new(web3).has_approved_relayer(some_user_address, some_relayer_address).call().await.unwrap()
//! # });
//! ```
//! #### set_relayer_approval()
//! Grants or revokes approval for the given `relayer` to call Authorizer-approved functions on behalf of `user`.
//!
//! [See Balancer documentation](https://dev.balancer.fi/references/contracts/apis/the-vault#hasapprovedrelayer)
//! ```no_run
//! use balancer_sdk::vault::Vault;
//! use balancer_sdk::*;
//! # use balancer_sdk::helpers::*;
//!
//! # tokio_test::block_on(async {
//! # let web3 = build_web3(&get_env_var("RPC_URL"));
//! let some_sender_address = addr!("0xBA12222222228d8Ba445958a75a0704d566BF2C8");
//! let some_relayer_address = addr!("0xBA12222222228d8Ba445958a75a0704d566BF2C8");
//! let is_approved = true;
//! Vault::new(web3).set_relayer_approval(some_sender_address, some_relayer_address, is_approved).call().await.unwrap()
//! # });
//! ```
//!
//! ## Internal Balances
//! #### get_internal_balances()
//! Get a user's internal balances. This is called UserBalance in external interfaces, and "internal balance" in the internal functions.
//!
//! [See Balancer documentation](https://dev.balancer.fi/references/contracts/apis/the-vault#getinternalbalances)
//! ```no_run
//! use balancer_sdk::vault::Vault;
//! use balancer_sdk::*;
//! # use balancer_sdk::helpers::*;
//!
//! # tokio_test::block_on(async {
//! # let web3 = build_web3(&get_env_var("RPC_URL"));
//! let some_user_address = addr!("0xBA12222222228d8Ba445958a75a0704d566BF2C8");
//! let token_address_1 = addr!("0xBA12222222228d8Ba445958a75a0704d566BF2C8");
//! let token_address_2 = addr!("0xBA12222222228d8Ba445958a75a0704d566BF2C8");
//! let tokens = vec![token_address_1, token_address_2];
//! Vault::new(web3).get_internal_balance(some_user_address, tokens).call().await.unwrap()
//! # });
//! ```
//! #### manage_user_balance()
//! There are four possible operations in manageUserBalance: each designates a sender/receiver, asset, and amount. The asset is either a token address or the zero address (meaning ETH). The Vault does not store ETH, but you can use ETH when interacting with internal balances; the Vault will do any necessary wrapping/unwrapping.
//!
//! [See Balancer documentation](https://dev.balancer.fi/references/contracts/apis/the-vault#manageuserbalance)
//! ```no_run
//! use balancer_sdk::vault::Vault;
//! use balancer_sdk::*;
//! # use balancer_sdk::helpers::*;
//!
//! # tokio_test::block_on(async {
//! # let web3 = build_web3(&get_env_var("RPC_URL"));
//! let some_user_address = addr!("0xBA12222222228d8Ba445958a75a0704d566BF2C8");
//! let token_address_1 = addr!("0xBA12222222228d8Ba445958a75a0704d566BF2C8");
//! let token_address_2 = addr!("0xBA12222222228d8Ba445958a75a0704d566BF2C8");
//! let tokens = vec![token_address_1, token_address_2];
//! Vault::new(web3).get_internal_balance(some_user_address, tokens).call().await.unwrap()
//! # });
//! ```
//!
//! ## Pools
//! #### register_pool()
//! Called from the pool contract to generate a  Pool ID, and enter it in the Vault's pool data structures.
//!
//! [See Balancer documentation](https://dev.balancer.fi/references/contracts/apis/the-vault#registerpool)
//! ```no_run
//! use balancer_sdk::vault::Vault;
//! use balancer_sdk::*;
//! # use balancer_sdk::helpers::*;
//!
//! # tokio_test::block_on(async {
//! # let web3 = build_web3(&get_env_var("RPC_URL"));
//! let pool_id = PoolId::from_str("0xBA12222222228d8Ba445958a75a0704d566BF2C8").unwrap();
//! let specialization = PoolSpecialization::General;
//! Vault::new(web3).register_pool(specialization as u8).call().await.unwrap()
//! # });
//! ```
//!
//! #### get_pool()
//! Returns a Pool's contract address and specialization setting.
//!
//! [See Balancer documentation](https://dev.balancer.fi/references/contracts/apis/the-vault#getpool)
//! ```no_run
//! use balancer_sdk::vault::Vault;
//! # use balancer_sdk::helpers::*;
//! use balancer_sdk::*;
//!
//! # tokio_test::block_on(async {
//! # let web3 = build_web3(&get_env_var("RPC_URL"));
//! let pool_id: PoolId = "0x0371c272fdd28ac13c434f1ef6b8b52ea3e6d844".parse().unwrap();
//!
//! Vault::new(web3).get_pool(pool_id.into()).call().await.unwrap()
//! # });
//! ```
//!
//! #### register_tokens()
//! Called from the pool contract to tell the Vault which tokens are valid for this pool (i.e., which can be used to swap, join, or exit). An asset manager can also be assigned to each token at this step, which is thereafter immutable (unless you deregister and register again).
//!
//! [See Balancer documentation](https://dev.balancer.fi/references/contracts/apis/the-vault#registertokens)
//! ```no_run
//! use balancer_sdk::vault::Vault;
//! # use balancer_sdk::helpers::*;
//! use balancer_sdk::*;
//!
//! # tokio_test::block_on(async {
//! # let web3 = build_web3(&get_env_var("RPC_URL"));
//! let pool_id: PoolId = "0x0371c272fdd28ac13c434f1ef6b8b52ea3e6d844".parse().unwrap();
//! let token_address_1 = addr!("0xBA12222222228d8Ba445958a75a0704d566BF2C8");
//! let token_address_2 = addr!("0xBA12222222228d8Ba445958a75a0704d566BF2C8");
//! let tokens = vec![token_address_1, token_address_2];
//! let manager_address_1 = addr!("0xBA12222222228d8Ba445958a75a0704d566BF2C8");
//! let manager_address_2 = addr!("0xBA12222222228d8Ba445958a75a0704d566BF2C8");
//! let asset_managers = vec![manager_address_1, manager_address_2];
//!
//! Vault::new(web3).register_tokens(pool_id.into(), tokens, asset_managers).call().await.unwrap()
//! # });
//! ```
//!
//! #### deregister_tokens()
//! Remove tokens from the pool (must have zero balance).
//!
//! [See Balancer documentation](https://dev.balancer.fi/references/contracts/apis/the-vault#deregistertokens)
//! ```no_run
//! use balancer_sdk::vault::Vault;
//! # use balancer_sdk::helpers::*;
//! use balancer_sdk::*;
//!
//! # tokio_test::block_on(async {
//! # let web3 = build_web3(&get_env_var("RPC_URL"));
//! let pool_id: PoolId = "0x0371c272fdd28ac13c434f1ef6b8b52ea3e6d844".parse().unwrap();
//! let token_address_1 = addr!("0xBA12222222228d8Ba445958a75a0704d566BF2C8");
//! let token_address_2 = addr!("0xBA12222222228d8Ba445958a75a0704d566BF2C8");
//! let tokens = vec![token_address_1, token_address_2];
//!
//! Vault::new(web3).deregister_tokens(pool_id.into(), tokens).call().await.unwrap()
//! # });
//! ```
//!
//! #### get_pool_token_info()
//! Return details of a particular token. While getPoolTokens gives the total balance, getPoolTokenInfo returns each component of the balance, as well as the time (block) it was last modified, and the asset manager.
//!
//! [See Balancer documentation](https://dev.balancer.fi/references/contracts/apis/the-vault#getpooltokeninfo)
//! ```no_run
//! use balancer_sdk::vault::Vault;
//! # use balancer_sdk::helpers::*;
//! use balancer_sdk::*;
//!
//! # tokio_test::block_on(async {
//! # let web3 = build_web3(&get_env_var("RPC_URL"));
//! let pool_id: PoolId = "0x0371c272fdd28ac13c434f1ef6b8b52ea3e6d844".parse().unwrap();
//! let token_address = addr!("0xBA12222222228d8Ba445958a75a0704d566BF2C8");
//!
//! Vault::new(web3).get_pool_token_info(pool_id.into(), token_address).call().await.unwrap()
//! # });
//! ```
//!
//! #### get_pool_tokens()
//! Returns a Pool's registered tokens, the total balance for each, and the most recent block in which any of the tokens were updated. Implemented by PoolAssets.
//!
//! [See Balancer documentation](https://dev.balancer.fi/references/contracts/apis/the-vault#getpooltokens)
//! ```no_run
//! use balancer_sdk::vault::Vault;
//! # use balancer_sdk::helpers::*;
//! use balancer_sdk::*;
//!
//! # tokio_test::block_on(async {
//! # let web3 = build_web3(&get_env_var("RPC_URL"));
//! let pool_id: PoolId = "0x0371c272fdd28ac13c434f1ef6b8b52ea3e6d844".parse().unwrap();
//!
//! Vault::new(web3).get_pool_tokens(pool_id.into()).call().await.unwrap()
//! # });
//! ```
//!
//! ## Joins and Exits
//! #### join_pool()
//!
//! [See Balancer documentation](https://dev.balancer.fi/references/contracts/apis/the-vault#joinpool)
//! [See Balancer Pool Joins documentation](https://dev.balancer.fi/resources/joins-and-exits/pool-joins)
//! ```no_run
//! use balancer_sdk::vault::Vault;
//! use balancer_sdk::*;
//! # use balancer_sdk::helpers::*;
//!
//! # tokio_test::block_on(async {
//! # let web3 = build_web3(&get_env_var("RPC_URL"));
//! let pool_id = PoolId::from_str("0xBA12222222228d8Ba445958a75a0704d566BF2C8").unwrap();
//! let sender_address = addr!("0xBA12222222228d8Ba445958a75a0704d566BF2C8");
//! let recipient_address = addr!("0xBA12222222228d8Ba445958a75a0704d566BF2C8");
//! let join_pool_request = JoinPoolRequest {
//!     assets: vec![addr!("0xBA12222222228d8Ba445958a75a0704d566BF2C8"), addr!("0xBA12222222228d8Ba445958a75a0704d566BF2C8")],
//!     max_amounts_in: vec![u256!("100"), u256!("200")],
//!     user_data: UserData("0x"),
//!     from_internal_balance: false
//! };
//!
//! Vault::new(web3).join_pool(pool_id.into(), sender_address, recipient_address, join_pool_request.into()).call().await.unwrap()
//! # });
//! ```
//!
//! #### exit_pool()
//!
//! [See Balancer method documentation](https://dev.balancer.fi/references/contracts/apis/the-vault#exitpool)
//! [See Balancer Pool Exits documentation](https://dev.balancer.fi/resources/joins-and-exits/pool-exits)
//! ```no_run
//! use balancer_sdk::vault::Vault;
//! use balancer_sdk::*;
//! # use balancer_sdk::helpers::*;
//!
//! # tokio_test::block_on(async {
//! # let web3 = build_web3(&get_env_var("RPC_URL"));
//! let pool_id = PoolId::from_str("0xBA12222222228d8Ba445958a75a0704d566BF2C8").unwrap();
//! let sender_address = addr!("0xBA12222222228d8Ba445958a75a0704d566BF2C8");
//! let recipient_address = addr!("0xBA12222222228d8Ba445958a75a0704d566BF2C8");
//! let exit_pool_request = ExitPoolRequest {
//!     assets: vec![addr!("0xBA12222222228d8Ba445958a75a0704d566BF2C8"), addr!("0xBA12222222228d8Ba445958a75a0704d566BF2C8")],
//!     max_amounts_out: vec![u256!("100"), u256!("200")],
//!     user_data: UserData("0x"),
//!     to_internal_balance: false
//! };
//!
//! Vault::new(web3).join_pool(pool_id.into(), sender_address, recipient_address, exit_pool_request.into()).call().await.unwrap()
//! # });
//! ```
//!
//! ## Single Swaps
//! [See Balancer Single Swaps documentation](https://dev.balancer.fi/guides/swaps/single-swaps)
//!
//! #### swap()
//! [See interface](struct.Vault.html#method.swap)
//!
//! [See Balancer documentation](https://dev.balancer.fi/references/contracts/apis/the-vault#swap)
//!
//! ```no_run
//! use balancer_sdk::vault::Vault;
//! use balancer_sdk::*;
//! # use balancer_sdk::helpers::*;
//!
//! # tokio_test::block_on(async {
//! # let web3 = build_web3(&get_env_var("RPC_URL"));
//!
//! let swap_step = SingleSwap {
//!     pool_id: PoolId::from_str("0xBA12222222228d8Ba445958a75a0704d566BF2C8").unwrap(),
//!     kind: SwapKind::GivenIn,
//!     asset_in: addr!("0x1f9840a85d5af5bf1d1762f925bdaddc4201f984"),
//!     asset_out: addr!("0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9"),
//!     amount: u256!("10"),
//!     user_data: UserData("0x").into(),
//! };
//!
//! let funds = FundManagement {
//!     sender: addr!("0xBA12222222228d8Ba445958a75a0704d566BF2C8"),
//!     from_internal_balance: false,
//!     recipient: addr!("0xBA12222222228d8Ba445958a75a0704d566BF2C8"),
//!     to_internal_balance: false,
//! };
//!
//! let limit = u256!("9125892514880");
//! let deadline = u256!("999999999999999999");
//! // Fake Private Key
//! let private_key = PrivateKey::from_str("00e0000a00aaaa0e0a000e0e0000e00e000a000000000000000aaa00a0aaaaaa").unwrap();
//!
//! let result = Vault::new(web3)
//!     .swap(swap_step.clone().into(), funds.into(), limit, deadline)
//!     .from(Account::Offline(private_key, Some(42)))
//!     .gas(u256!("4712388"))
//!     .gas_price(u256!("100000000000").into())
//!     .send()
//!     .await
//!     .unwrap();
//! # });
//! ```
//! ## Batch Swaps
//!
//! [See Balancer Batch Swaps documentation](https://dev.balancer.fi/guides/swaps/batch-swaps)
//!
//! #### batch_swap()
//! Batch swap "steps" specify the assets involved, "many-to-many" sources and destinations, and min/max token limits to guard against slippage. There is also an optional deadline, after which the swap will timeout and revert. These return the token "deltas" - the net result of executing each swap sequentially.
//!
//! [See interface](struct.Vault.html#method.batch_swap)
//!
//! [See Balancer documentation](https://dev.balancer.fi/references/contracts/apis/the-vault#batch-swaps)
//! ```no_run
//! use balancer_sdk::vault::Vault;
//! use balancer_sdk::*;
//! # use balancer_sdk::helpers::*;
//!
//! # tokio_test::block_on(async {
//! # let web3 = build_web3(&get_env_var("RPC_URL"));
//! let assets = vec![
//!     addr!("0x1f9840a85d5af5bf1d1762f925bdaddc4201f984"),
//!     addr!("0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9"),
//! ];
//!
//! let limits = vec![i256!("1000000000000000000"), i256!("1000000000000000000")];
//!
//! let swap_step = BatchSwapStep::new(
//!     pool_id!("0x0371c272fdd28ac13c434f1ef6b8b52ea3e6d844"),
//!     0,
//!     1,
//!     "10",
//!     UserData("0x"),
//! );
//!
//! let funds = FundManagement {
//!     sender: addr!("0xBA12222222228d8Ba445958a75a0704d566BF2C8"),
//!     from_internal_balance: false,
//!     recipient: addr!("0xBA12222222228d8Ba445958a75a0704d566BF2C8"),
//!     to_internal_balance: false,
//! };
//!
//! let private_key = PrivateKey::from_str("00e0000a00aaaa0e0a000e0e0000e00e000a000000000000000aaa00a0aaaaaa").unwrap();
//!
//! let result = Vault::new(web3)
//!     .batch_swap(
//!         SwapKind::GivenIn as u8,
//!         vec![swap_step.into()],
//!         assets,
//!         funds.into(),
//!         limits,
//!         // Infinity
//!         u256!("999999999999999999"),
//!     )
//!     .from(Account::Offline(private_key, None))
//!     .gas(u256!("4712388"))
//!     .gas_price(u256!("100000000000").into())
//!     .send()
//!     .await
//!     .unwrap();
//! # });
//! ```
//!
//! #### query_batch_swap()
//! The queryBatchSwap method executes the exact same code as batchSwap - but reverts at the end. This is for GUIs or scripts to calculate a "dry run" of a sequence of swaps. Implemented in Swaps.
//!
//! [See interface](struct.Vault.html#method.query_batch_swap)
//!
//! [See Balancer documentation](https://dev.balancer.fi/references/contracts/apis/the-vault#batch-swaps)
//! ```no_run
//! use balancer_sdk::vault::Vault;
//! use balancer_sdk::*;
//! # use balancer_sdk::helpers::*;
//!
//! # tokio_test::block_on(async {
//! # let web3 = build_web3(&get_env_var("RPC_URL"));
//! let assets = vec![
//!     addr!("0x1f9840a85d5af5bf1d1762f925bdaddc4201f984"),
//!     addr!("0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9"),
//! ];
//!
//! let swap_step = BatchSwapStep::new(
//!     pool_id!("0x0371c272fdd28ac13c434f1ef6b8b52ea3e6d844"),
//!     0,
//!     1,
//!     "10",
//!     UserData("0x"),
//! );
//!
//! let funds = FundManagement {
//!     sender: addr!("0xBA12222222228d8Ba445958a75a0704d566BF2C8"),
//!     from_internal_balance: false,
//!     recipient: addr!("0xBA12222222228d8Ba445958a75a0704d566BF2C8"),
//!     to_internal_balance: false,
//! };
//!
//! let result = Vault::new(web3)
//!     .query_batch_swap(
//!         SwapKind::GivenIn as u8,
//!         vec![swap_step.into()],
//!         assets,
//!         funds.into(),
//!     )
//!     .send()
//!     .await
//!     .unwrap();
//! # });
//! ```
//!
//! ## Flash Loans
//!
//! #### flash_loan()
//! Execute a flash loan. This sends the given token amounts to the flash loan receiver contract; all borrowed funds - plus the protocol flash loan fee - must be returned to the vault in the same transaction, or it will revert. Implemented by a FlashLoans subclass. Implemented in FlashLoans.
//!
//! [See interface](struct.Vault.html#method.flash_loan)
//!
//! [See Balancer documentation](https://dev.balancer.fi/references/contracts/apis/the-vault#flashloan)
//! ```no_run
//! use balancer_sdk::vault::Vault;
//! use balancer_sdk::*;
//! # use balancer_sdk::helpers::*;
//!
//! # tokio_test::block_on(async {
//! # let web3 = build_web3(&get_env_var("RPC_URL"));
//! let tokens = vec![
//!     addr!("0x1f9840a85d5af5bf1d1762f925bdaddc4201f984"),
//!     addr!("0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9"),
//! ];
//!
//! let private_key = PrivateKey::from_str("00e0000a00aaaa0e0a000e0e0000e00e000a000000000000000aaa00a0aaaaaa").unwrap();
//!
//! let result = Vault::new(web3)
//!     .flash_loan(
//!         // Recipient address
//!         addr!("0xBA12222222228d8Ba445958a75a0704d566BF2C8"),
//!         tokens,
//!         vec![u256!("1000000000"), u256!("100000000")],
//!         UserData("0x").into(),
//!     )
//!     .from(Account::Offline(private_key, None))
//!     .gas(u256!("4712388"))
//!     .gas_price(u256!("100000000000").into())
//!     .send()
//!     .await
//!     .unwrap();
//! # });
//! ```

pub use super::generated_contracts::vault::Vault;
use crate::Address;
use std::str::FromStr;

/// This should always be the same address across chains
pub const VAULT_CONTRACT_ADDRESS: &str = "0xBA12222222228d8Ba445958a75a0704d566BF2C8";

impl Vault {
    pub fn new(web3: ethcontract::Web3<ethcontract::web3::transports::Http>) -> Self {
        let vault_address = super::addr!(VAULT_CONTRACT_ADDRESS);
        Vault::at(&web3, vault_address)
    }
}
