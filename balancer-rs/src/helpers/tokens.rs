//! Module for Token contract helpers
//!

use ethcontract::{errors::MethodError, transaction::TransactionResult, Account, PrivateKey, U256};

use crate::{Address, Web3, ERC20};

/// Helper class for approving tokens.
///
/// # Basic usage:
///
/// ```no_run
/// use balancer_rs::*;
/// use std::str::FromStr;
/// use ethcontract::PrivateKey;
///
/// # tokio_test::block_on(async {
/// const RPC_URL: &str = balancer_rs::constants::rpc_endpoints::KOVAN_TESTNET;
/// let transport = ethcontract::web3::transports::Http::new(RPC_URL).unwrap();
/// let web3 = ethcontract::Web3::new(transport);
///
/// /// USDC Address
/// let private_key = balancer_rs::helpers::get_env_var("PRIVATE_KEY");
/// let private_key = PrivateKey::from_str(&private_key).unwrap();
///
/// let token_approver = TokenApprover::new(web3, addr!(vault::VAULT_CONTRACT_ADDRESS), private_key);
///
/// let token = addr!("0xc2569dd7d0fd715b054fbf16e75b001e5c0c1115");
/// let result = token_approver.approve(token, u256!("1000000000000000000")).await.unwrap();
/// println!("Approval result: {:#?}", result);
/// # });
/// ```
#[derive(Clone, Debug)]
pub struct TokenApprover {
    web3: Web3,
    private_key: PrivateKey,
    spender: Address,
}
impl TokenApprover {
    pub fn new(web3: Web3, spender: Address, private_key: PrivateKey) -> Self {
        TokenApprover {
            web3,
            private_key,
            spender,
        }
    }

    /// Approve a token for use with the Balancer Vault
    pub async fn approve(
        &self,
        token_address: Address,
        amount: U256,
    ) -> Result<TransactionResult, MethodError> {
        let contract_instance = ERC20::at(&self.web3, token_address);
        contract_instance
            .approve(self.spender.clone(), amount)
            .from(Account::Offline(self.private_key.clone(), None))
            .send()
            .await
    }
}
