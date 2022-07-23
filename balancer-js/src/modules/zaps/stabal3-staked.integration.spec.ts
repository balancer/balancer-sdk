import dotenv from 'dotenv';
import { expect } from 'chai';
import hardhat from 'hardhat';
import { Contract } from 'ethers';
import { Network, RelayerAuthorization } from '@/.';
import { BigNumber } from '@ethersproject/bignumber';
import { Contracts } from '@/modules/contracts/contracts.module';
import { ADDRESSES } from './bbausd2-migrations/addresses';
import { MigrateStaBal3 as Migration } from './migrate-stabal3';
import { setBalance } from '@nomicfoundation/hardhat-network-helpers';
import { parseEther, formatEther } from '@ethersproject/units';
import { JsonRpcSigner } from '@ethersproject/providers';
import { MaxUint256 } from '@ethersproject/constants';

import { Relayer } from '@/modules/relayer/relayer.module';
import { Interface } from '@ethersproject/abi';
import balancerRelayerAbi from '@/lib/abi/BalancerRelayer.json';
const liquidityGaugeAbi = ['function deposit(uint value) payable'];
const balancerRelayerInterface = new Interface(balancerRelayerAbi);
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

const { ALCHEMY_URL: jsonRpcUrl, FORKED_BLOCK_NUMBER: blockNumber } =
  process.env;
const { ethers } = hardhat;
const MAX_GAS_LIMIT = 8e6;

const network = Network.GOERLI;
const rpcUrl = 'http://127.0.0.1:8545';
const provider = new ethers.providers.JsonRpcProvider(rpcUrl, network);
const addresses = ADDRESSES[network];
const { contracts } = new Contracts(network as number, provider);
const migration = new Migration(network, provider);

const holderAddress = '0xe0a171587b1cae546e069a943eda96916f5ee977';
const poolAddress = '0x16faf9f73748013155b7bc116a3008b57332d1e6';
const gaugeAddress = '0xf0f572ad66baacdd07d8c7ea3e0e5efa56a76081';
// const poolAddress = addresses.staBal3.address;
// const gaugeAddress = addresses.staBal3.gauge;

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
          blockNumber: blockNumber || 7273825,
        },
      },
    ]);

    signer = provider.getSigner();
    signerAddress = await signer.getAddress();

    // Transfer tokens from existing user account to signer
    // We need that to test signatures, because hardhat doesn't have impersonated accounts private keys
    const holder = await impersonateAccount(holderAddress);
    const balance = await getErc20Balance(poolAddress, holderAddress);
    await contracts
      .ERC20(poolAddress, provider)
      .connect(holder)
      .transfer(signerAddress, balance);

    // Stake them
    await (
      await contracts
        .ERC20(poolAddress, provider)
        .connect(signer)
        .approve(gaugeAddress, MaxUint256)
    ).wait();

    await (
      await signer.sendTransaction({
        to: gaugeAddress,
        data: liquidityGauge.encodeFunctionData('deposit', [balance]),
      })
    ).wait();
  });

  it('should transfer tokens from stable to boosted', async () => {
    // Store balance before migration
    const before = {
      from: await getErc20Balance(gaugeAddress, signerAddress),
      to: await getErc20Balance(addresses.bbausd2.gauge, signerAddress),
    };
    // console.log(before);

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
      true
    );

    const response = await signer.sendTransaction({
      to: query.to,
      data: query.data,
      gasLimit: MAX_GAS_LIMIT,
    });

    const reciept = await response.wait();
    console.log('Gas used', reciept.gasUsed.toString());

    const internalBalances1 = await contracts.vault.getInternalBalance(addresses.relayer, [addresses.DAI, addresses.USDC]);
    const internalBalances2 = await contracts.vault.getInternalBalance(signerAddress, [addresses.DAI, addresses.USDC]);
    const internalBalances3 = await contracts.vault.getInternalBalance(gaugeAddress, [addresses.DAI, addresses.USDC]);
    console.log(internalBalances1, internalBalances2, internalBalances3);

    const after = {
      from: await getErc20Balance(gaugeAddress, signerAddress),
      to: await getErc20Balance(addresses.bbausd2.gauge, signerAddress),
    };

    console.log(before, after);

    const diffs = {
      from: after.from.sub(before.from),
      to: after.to.sub(before.to),
    };

    console.log(diffs.from, diffs.to);

    expect(diffs.from).to.eql(before.from.mul(-1));
    expect(parseFloat(formatEther(diffs.to))).to.be.gt(0);
  }).timeout(20000);
}).timeout(20000);
