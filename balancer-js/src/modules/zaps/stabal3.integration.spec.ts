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

import { Interface } from '@ethersproject/abi';
const liquidityGaugeAbi = ['function deposit(uint value) payable'];
const liquidityGauge = new Interface(liquidityGaugeAbi);

/*
 * Testing on GOERLI
 * - Update hardhat.config.js with chainId = 5
 * - Update ALCHEMY_URL on .env with a goerli api key
 * - Run goerli node on terminal: yarn run node
 * - Change `network` to Network.GOERLI
 * - Provide gaugeAddresses from goerli which can be found on subgraph: https://thegraph.com/hosted-service/subgraph/balancer-labs/balancer-gauges-goerli
 */

dotenv.config();

const { ALCHEMY_URL: jsonRpcUrl, FORK_BLOCK_NUMBER: blockNumber } = process.env;
const { ethers } = hardhat;
const MAX_GAS_LIMIT = 8e6;

const network = Network.GOERLI;
const rpcUrl = 'http://127.0.0.1:8545';
const provider = new ethers.providers.JsonRpcProvider(rpcUrl, network);
const addresses = ADDRESSES[network];
const { contracts } = new Contracts(network as number, provider);
const migration = new Migration(network, provider);

const holderAddress = '0xe0a171587b1cae546e069a943eda96916f5ee977';
const poolAddress = addresses.staBal3.address;
const gaugeAddress = addresses.staBal3.gauge;
const relayer = addresses.relayer;

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

const reset = () =>
  provider.send('hardhat_reset', [
    {
      forking: {
        jsonRpcUrl,
        blockNumber: (blockNumber && parseInt(blockNumber)) || 7277540,
      },
    },
  ]);

const move = async (
  token: string,
  from: string,
  to: string
): Promise<BigNumber> => {
  const holder = await impersonateAccount(from);
  const balance = await getErc20Balance(token, from);
  await contracts.ERC20(token, provider).connect(holder).transfer(to, balance);

  return balance;
};

const stake = async (
  signer: JsonRpcSigner,
  balance: BigNumber
): Promise<void> => {
  await (
    await contracts
      .ERC20(poolAddress, provider)
      .connect(signer)
      .approve(gaugeAddress, MaxUint256)
  ).wait();

  await (
    await contracts
      .ERC20(addresses.bbausd1.address, provider)
      .connect(signer)
      .approve(addresses.bbausd1.gauge, MaxUint256)
  ).wait();

  await (
    await signer.sendTransaction({
      to: gaugeAddress,
      data: liquidityGauge.encodeFunctionData('deposit', [balance]),
    })
  ).wait();
};

describe('execution', async () => {
  let signer: JsonRpcSigner;
  let signerAddress: string;
  let authorisation: string;
  let balance: BigNumber;

  beforeEach(async () => {
    await reset();

    signer = provider.getSigner();
    signerAddress = await signer.getAddress();
    authorisation = await signRelayerApproval(relayer, signerAddress, signer);

    // Transfer tokens from existing user account to signer
    // We need that to test signatures, because hardhat doesn't have impersonated accounts private keys
    balance = await move(poolAddress, holderAddress, signerAddress);
  });

  context('staked', async () => {
    beforeEach(async function () {
      this.timeout(20000);

      // Stake them
      await stake(signer, balance);
    });

    it('should transfer tokens from stable to boosted', async () => {
      // Store balance before migration
      const before = {
        from: await getErc20Balance(gaugeAddress, signerAddress),
        to: await getErc20Balance(addresses.bbausd2.gauge, signerAddress),
      };

      const query = await migration.queryMigration(
        signerAddress,
        before.from.toString(),
        authorisation,
        true
      );

      const { to, data } = query;
      const gasLimit = MAX_GAS_LIMIT;
      const response = await signer.sendTransaction({ to, data, gasLimit });

      const reciept = await response.wait();
      console.log('Gas used', reciept.gasUsed.toString());

      const after = {
        from: await getErc20Balance(gaugeAddress, signerAddress),
        to: await getErc20Balance(addresses.bbausd2.gauge, signerAddress),
      };

      const diffs = {
        from: after.from.sub(before.from),
        to: after.to.sub(before.to),
      };

      console.log(diffs.from, diffs.to);

      expect(diffs.from).to.eql(before.from.mul(-1));
      expect(parseFloat(formatEther(diffs.to))).to.be.gt(0);
    }).timeout(20000);
  });

  context('not staked', async () => {
    it('should transfer tokens from stable to boosted', async () => {
      // Store balance before migration
      const before = {
        from: await getErc20Balance(poolAddress, signerAddress),
        to: await getErc20Balance(addresses.bbausd2.address, signerAddress),
      };

      const query = await migration.queryMigration(
        signerAddress,
        before.from.toString(),
        authorisation,
        false
      );

      const { to, data } = query;
      const gasLimit = MAX_GAS_LIMIT;
      const response = await signer.sendTransaction({ to, data, gasLimit });

      const reciept = await response.wait();
      console.log('Gas used', reciept.gasUsed.toString());

      const after = {
        from: await getErc20Balance(poolAddress, signerAddress),
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
  });
}).timeout(20000);
