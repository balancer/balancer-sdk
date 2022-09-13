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
import { subSlippage } from '@/lib/utils/slippageHelper';

dotenv.config();
const { ALCHEMY_URL: jsonRpcUrl } = process.env;

// /*
//  * Testing on GOERLI
//  * - Update hardhat.config.js with chainId = 5
//  * - Update ALCHEMY_URL on .env with a goerli api key
//  * - Run node on terminal: yarn run node
//  * - Uncomment this section
//  */
// const network = Network.GOERLI;
// const holderAddress = '0xe0a171587b1cae546e069a943eda96916f5ee977'; // GOERLI
// const blockNumber = 7277540;

/*
 * Testing on MAINNET
 * - Update hardhat.config.js with chainId = 1
 * - Update ALCHEMY_URL on .env with a mainnet api key
 * - Run node on terminal: yarn run node
 * - Uncomment this section
 */
const network = Network.MAINNET;
const holderAddress = '0xf346592803eb47cb8d8fa9f90b0ef17a82f877e0';
const blockNumber = 15526452;

const { ethers } = hardhat;
const MAX_GAS_LIMIT = 8e6;

const rpcUrl = 'http://127.0.0.1:8545';
const provider = new ethers.providers.JsonRpcProvider(rpcUrl, network);
const addresses = ADDRESSES[network];
const fromPool = {
  id: addresses.staBal3.id,
  address: addresses.staBal3.address,
  gauge: addresses.staBal3.gauge,
};
const toPool = {
  id: addresses.bbausd2.id,
  address: addresses.bbausd2.address,
  gauge: addresses.bbausd2.gauge,
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

describe('stabal3 migration execution', async () => {
  let signer: JsonRpcSigner;
  let signerAddress: string;
  let authorisation: string;
  let balance: BigNumber;

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

    let query = migrations.stabal3(
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
    const expectedBptOut = query.decode(staticResult, staked);
    const slippageAsBasisPoints = BigNumber.from('1'); // 0.01%
    const expectedWithSlippage = subSlippage(
      BigNumber.from(expectedBptOut),
      slippageAsBasisPoints
    );

    query = migrations.stabal3(
      signerAddress,
      amount.toString(),
      minBptOut ? minBptOut : expectedWithSlippage.toString(),
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

    expect(BigNumber.from(expectedBptOut).gt(0)).to.be.true;
    expect(after.from.toString()).to.eq('0');
    expect(after.to.gte(expectedWithSlippage)).to.be.true;
    return expectedBptOut;
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
