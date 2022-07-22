import dotenv from 'dotenv';
import { expect } from 'chai';
import hardhat from 'hardhat';
import { Network, RelayerAuthorization } from '@/.';
import { BigNumber, parseFixed } from '@ethersproject/bignumber';
import { Contracts } from '@/modules/contracts/contracts.module';
import { ADDRESSES } from './bbausd2-migrations/addresses';
import { MigrateStaBal3 as Migration } from './migrate-stabal3';
import { setBalance } from '@nomicfoundation/hardhat-network-helpers';
import { parseEther, formatEther } from '@ethersproject/units';
import { ContractTransaction } from '@ethersproject/contracts';
import { JsonRpcSigner } from '@ethersproject/providers';
import { MaxUint256 } from '@ethersproject/constants';

/*
 * Testing on GOERLI
 * - Update hardhat.config.js with chainId = 5
 * - Update ALCHEMY_URL on .env with a goerli api key
 * - Run goerli node on terminal: yarn run node
 * - Change `network` to Network.GOERLI
 * - Provide gaugeAddresses from goerli which can be found on subgraph: https://thegraph.com/hosted-service/subgraph/balancer-labs/balancer-gauges-goerli
 */

dotenv.config();

const { ALCHEMY_URL: jsonRpcUrl } = process.env;
const { ethers } = hardhat;
const MAX_GAS_LIMIT = 8e6;

const network = Network.GOERLI;
const rpcUrl = 'http://127.0.0.1:8545';
const provider = new ethers.providers.JsonRpcProvider(rpcUrl, network);
const addresses = ADDRESSES[network];
const { contracts } = new Contracts(5, provider);
const migration = new Migration(network, provider);

// https://hardhat.org/hardhat-network/docs/guides/forking-other-networks#impersonating-accounts
// WARNING: don't use hardhat SignerWithAddress to sendTransactions!!
// It's not working and we didn't have time to figure out why.
// Use JsonRpcSigner instead
const impersonateAccount = async (account: string) => {
  await provider.send('hardhat_impersonateAccount', [account]);
  await setBalance(account, parseEther('10000'));
  return provider.getSigner(account);
};

const approveRelayer = async (
  address: string,
  signer: JsonRpcSigner,
  withSignature = false
): Promise<ContractTransaction> => {
  let calldata = contracts.vault.interface.encodeFunctionData(
    'setRelayerApproval',
    [address, addresses.relayer, true]
  );

  if (withSignature) {
    const signature =
      await RelayerAuthorization.signSetRelayerApprovalAuthorization(
        contracts.vault,
        signer,
        address,
        calldata
      );
    calldata = RelayerAuthorization.encodeCalldataAuthorization(
      calldata,
      MaxUint256,
      signature
    );
  }

  // Hardcoding a gas limit prevents (slow) gas estimation
  return signer.sendTransaction({
    to: contracts.vault.address,
    data: calldata,
    gasLimit: MAX_GAS_LIMIT,
  });
};

// Test Scenarios

describe('execution', async () => {
  before(async function () {
    this.timeout(20000);

    await provider.send('hardhat_reset', [
      {
        forking: {
          jsonRpcUrl,
          blockNumber: 7269604,
        },
      },
    ]);
  });

  it('should transfer tokens from stable to boosted', async () => {
    const holderAddress = '0xe0a171587b1cae546e069a943eda96916f5ee977';
    const holder = await impersonateAccount(holderAddress);

    const balance = await contracts
      .ERC20(addresses.staBal3.address, provider)
      .balanceOf(holderAddress);

    // Approval
    await (
      await contracts.vault
        .connect(holder)
        .setRelayerApproval(holderAddress, addresses.relayer, true)
    ).wait();

    const query = await migration.queryMigration(
      holderAddress,
      balance,
      '', // can we use signature with relayer?
      false
    );

    const response = await holder.sendTransaction({
      to: query.to,
      data: query.data,
      gasLimit: MAX_GAS_LIMIT,
    });

    const reciept = await response.wait();
    console.log(reciept);

    const balanceAfterExit = await contracts
      .ERC20(addresses.staBal3.address, provider)
      .balanceOf(holderAddress);

    console.log(balance, balanceAfterExit);

    expect(balanceAfterExit).to.eq(0);
  }).timeout(20000);
}).timeout(20000);
