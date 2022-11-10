import dotenv from 'dotenv';
import { expect } from 'chai';
import hardhat from 'hardhat';
import { Network, RelayerAuthorization } from '@/.';
import { BigNumber } from '@ethersproject/bignumber';
import { Contracts } from '@/modules/contracts/contracts.module';
import { ADDRESSES } from './addresses';
import { JsonRpcSigner } from '@ethersproject/providers';
import { MaxUint256 } from '@ethersproject/constants';
import { Migrations } from '../migrations';
import { getErc20Balance, move, stake } from '@/test/lib/utils';

dotenv.config();

/*
 * Testing on GOERLI
 * - Run node on terminal: yarn run node:goerli
 * - Uncomment section below
 */
const network = Network.GOERLI;
const blockNumber = 7376670;
const holderAddress = '0x8fe3a2a5ae6baa201c26fc7830eb713f33d6b313';
const { ALCHEMY_URL_GOERLI: jsonRpcUrl } = process.env;
const rpcUrl = 'http://127.0.0.1:8000';

/*
 * Testing on POLYGON
 * - Run node on terminal: yarn run node:polygon
 * - Uncomment section below
 */
// const network = Network.POLYGON;
// const blockNumber = 32856000;
// const holderAddress = '0xfb0272990728a967ecaf702a1291fcd64c38ed25';
// const { ALCHEMY_URL_POLYGON: jsonRpcUrl } = process.env;
// const rpcUrl = 'http://127.0.0.1:8545';

const { ethers } = hardhat;
const MAX_GAS_LIMIT = 8e6;

const provider = new ethers.providers.JsonRpcProvider(rpcUrl, network);
const addresses = ADDRESSES[network];
const fromPool = {
  id: addresses.maiusd.id,
  address: addresses.maiusd.address,
  gauge: addresses.maiusd.gauge,
};
const toPool = {
  id: addresses.maibbausd.id,
  address: addresses.maibbausd.address,
  gauge: addresses.maibbausd.gauge,
};
const { contracts } = new Contracts(network as number, provider);
const migrations = new Migrations(network);

const relayer = addresses.relayer;

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
        blockNumber,
      },
    },
  ]);

describe('maiusd migration execution', async () => {
  let signer: JsonRpcSigner;
  let signerAddress: string;
  let authorisation: string;
  let balance: BigNumber;

  before(async function () {
    try {
      const currentNetwork = await provider.getNetwork();
      if (currentNetwork.chainId != network) {
        this.skip();
      }
    } catch (err) {
      console.log(err);
      this.skip();
    }
  });

  beforeEach(async function () {
    await reset();

    signer = provider.getSigner();
    signerAddress = await signer.getAddress();
    authorisation = await signRelayerApproval(relayer, signerAddress, signer);

    // Transfer tokens from existing user account to signer
    // We need that to test signatures, because hardhat doesn't have impersonated accounts private keys
    balance = await move(
      fromPool.address,
      holderAddress,
      signerAddress,
      provider
    );
  });

  async function testFlow(
    staked: boolean,
    authorised = true,
    minBptOut: undefined | string = undefined
  ): Promise<string> {
    const addressIn = staked ? fromPool.gauge : fromPool.address;
    const addressOut = staked ? toPool.gauge : toPool.address;
    // Store balance before migration
    const before = {
      from: await getErc20Balance(addressIn, provider, signerAddress),
      to: await getErc20Balance(addressOut, provider, signerAddress),
    };

    const amount = before.from;

    let query = migrations.maiusd(
      signerAddress,
      amount.toString(),
      '0',
      staked,
      authorisation
    );
    const gasLimit = MAX_GAS_LIMIT;

    // Static call can be used to simulate tx and get expected BPT in/out deltas
    const staticResult = await signer.call({
      to: query.to,
      data: query.data,
      gasLimit,
    });
    const bptOut = query.decode(staticResult, staked);

    query = migrations.maiusd(
      signerAddress,
      amount.toString(),
      minBptOut ? minBptOut : bptOut,
      staked,
      authorised ? authorisation : undefined
    );

    const response = await signer.sendTransaction({
      to: query.to,
      data: query.data,
      gasLimit,
    });

    const receipt = await response.wait();
    console.log('Gas used', receipt.gasUsed.toString());

    const after = {
      from: await getErc20Balance(addressIn, provider, signerAddress),
      to: await getErc20Balance(addressOut, provider, signerAddress),
    };

    console.log(bptOut);

    expect(BigNumber.from(bptOut).gt(0)).to.be.true;
    expect(after.from.toString()).to.eq('0');
    expect(after.to.toString()).to.eq(bptOut);
    return bptOut;
  }

  let bptOut: string;

  context('staked', async () => {
    beforeEach(async function () {
      // Stake them
      await stake(signer, fromPool.address, fromPool.gauge, balance);
    });

    it('should transfer tokens from stable to boosted', async () => {
      bptOut = await testFlow(true);
    });

    it('should transfer tokens from stable to boosted - limit should fail', async () => {
      let errorMessage = '';
      try {
        await testFlow(true, true, BigNumber.from(bptOut).add(1).toString());
      } catch (error) {
        errorMessage = (error as Error).message;
      }
      expect(errorMessage).to.contain('BAL#507'); // SWAP_LIMIT - Swap violates user-supplied limits (min out or max in)
    });
  });

  context('not staked', async () => {
    it('should transfer tokens from stable to boosted', async () => {
      bptOut = await testFlow(false);
    });

    it('should transfer tokens from stable to boosted - limit should fail', async () => {
      let errorMessage = '';
      try {
        await testFlow(false, true, BigNumber.from(bptOut).add(1).toString());
      } catch (error) {
        errorMessage = (error as Error).message;
      }
      expect(errorMessage).to.contain('BAL#507'); // SWAP_LIMIT - Swap violates user-supplied limits (min out or max in)
    });
  });

  context('authorisation', async () => {
    // authorisation wihtin relayer is the default case and is already tested on previous scenarios

    it('should transfer tokens from stable to boosted - pre authorised', async () => {
      const approval = contracts.vault.interface.encodeFunctionData(
        'setRelayerApproval',
        [signerAddress, relayer, true]
      );
      await signer.sendTransaction({
        to: contracts.vault.address,
        data: approval,
      });
      await testFlow(false, false);
    });

    it('should transfer tokens from stable to boosted - auhtorisation should fail', async () => {
      let errorMessage = '';
      try {
        await testFlow(false, false);
      } catch (error) {
        errorMessage = (error as Error).message;
      }
      expect(errorMessage).to.contain('BAL#503'); // USER_DOESNT_ALLOW_RELAYER - Relayers must be allowed by both governance and the user account
    });
  });
});
