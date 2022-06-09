//! Module for Token contract helpers
//!

use ethcontract::{errors::MethodError, transaction::TransactionResult, Account, PrivateKey, U256};

use crate::{Address, Web3, ERC20};

/// Helper class for approving tokens.
///
/// # Basic usage:
///
/// ```
/// let token_approver = TokenApprover::new(web3);
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
