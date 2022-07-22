import dotenv from 'dotenv';
import { expect } from 'chai';
import hardhat from 'hardhat';
import { Network, RelayerAuthorization } from '@/.';
import { BigNumber } from '@ethersproject/bignumber';
import { Contracts } from '@/modules/contracts/contracts.module';
import { ADDRESSES } from './bbausd2-migrations/addresses';
import { MigrateStaBal3 as Migration } from './migrate-stabal3';
import { setBalance } from '@nomicfoundation/hardhat-network-helpers';
import { parseEther, formatEther } from '@ethersproject/units';
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

const holderAddress = '0xe0a171587b1cae546e069a943eda96916f5ee977';
const network = Network.GOERLI;
const rpcUrl = 'http://127.0.0.1:8545';
const provider = new ethers.providers.JsonRpcProvider(rpcUrl, network);
const addresses = ADDRESSES[network];
const { contracts } = new Contracts(5, provider);
const migration = new Migration(network, provider);

const getErc20Balance = (token: string, holder: string): Promise<BigNumber> =>
  contracts.ERC20(token, provider).balanceOf(holder);

// https://hardhat.org/hardhat-network/docs/guides/forking-other-networks#impersonating-accounts
// WARNING: don't use hardhat SignerWithAddress to sendTransactions!!
// It's not working and we didn't have time to figure out why.
// Use JsonRpcSigner instead
const impersonateAccount = async (account: string) => {
  await provider.send('hardhat_impersonateAccount', [account]);
  await setBalance(account, parseEther('10000'));
  return provider.getSigner(account);
};

const signRelayerApproval = async (
  relayerAddress: string,
  signerAddress: string,
  signer: JsonRpcSigner
): Promise<string> => {
  const approval = contracts.vault.interface.encodeFunctionData(
    'setRelayerApproval',
    [signerAddress, relayerAddress, true]
  );

  const signature =
    await RelayerAuthorization.signSetRelayerApprovalAuthorization(
      contracts.vault,
      signer,
      relayerAddress,
      approval
    );

  const calldata = RelayerAuthorization.encodeCalldataAuthorization(
    '0x',
    MaxUint256,
    signature
  );

  return calldata;
};

describe('execution', async () => {
  let signer: JsonRpcSigner;
  let signerAddress: string;

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

    signer = provider.getSigner();
    signerAddress = await signer.getAddress();

    // Transfer tokens from existing user account to signer
    // We need that to test signatures, because hardhat doesn't have impersonated accounts private keys
    const holder = await impersonateAccount(holderAddress);
    const balance = await getErc20Balance(
      addresses.staBal3.address,
      holderAddress
    );
    await contracts
      .ERC20(addresses.staBal3.address, provider)
      .connect(holder)
      .transfer(signerAddress, balance);

    // TODO: Stake them
  });

  it('should transfer tokens from stable to boosted', async () => {
    // Store balancer before migration
    const before = {
      from: await getErc20Balance(addresses.staBal3.address, signerAddress),
      to: await getErc20Balance(addresses.bbausd2.address, signerAddress),
    };

    // Get authorisation
    const authorisation = await signRelayerApproval(
      addresses.relayer,
      signerAddress,
      signer
    );

    const query = await migration.queryMigration(
      signerAddress,
      before.from.toString(),
      authorisation,
      false
    );

    const response = await signer.sendTransaction({
      to: query.to,
      data: query.data,
      gasLimit: MAX_GAS_LIMIT,
    });

    const reciept = await response.wait();
    console.log('Gas used', reciept.gasUsed.toString());

    const after = {
      from: await getErc20Balance(addresses.staBal3.address, signerAddress),
      to: await getErc20Balance(addresses.bbausd2.address, signerAddress),
    };

    const diffs = {
      from: after.from.sub(before.from),
      to: after.to.sub(before.to),
    };

    console.log(diffs.from, diffs.to);

    expect(diffs.from).to.eql(before.from.mul(-1));
    expect(parseFloat(formatEther(diffs.to))).to.be.gt(0);
  }).timeout(20000);
}).timeout(20000);
