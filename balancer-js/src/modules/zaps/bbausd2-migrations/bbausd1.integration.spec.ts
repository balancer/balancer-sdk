import dotenv from 'dotenv';
import { expect } from 'chai';
import hardhat from 'hardhat';
import {
  BalancerError,
  BalancerErrorCode,
  BalancerSDK,
  Network,
  RelayerAuthorization,
  PoolWithMethods,
} from '@/.';
import { BigNumber, parseFixed } from '@ethersproject/bignumber';
import { Contracts } from '@/modules/contracts/contracts.module';
import { ADDRESSES } from './addresses';
import { JsonRpcSigner } from '@ethersproject/providers';
import { MaxUint256, WeiPerEther } from '@ethersproject/constants';
import { Migrations } from '../migrations';
import { getErc20Balance, move, stake } from '@/test/lib/utils';

dotenv.config();

/*
 * Testing on GOERLI
 * - Run node on terminal: yarn run node:goerli
 * - Uncomment section below
 */
// const network = Network.GOERLI;
// const blockNumber = 7277540;
// const holderAddress = '0xd86a11b0c859c18bfc1b4acd072c5afe57e79438';
// const { ALCHEMY_URL_GOERLI: jsonRpcUrl } = process.env;
// const rpcUrl = 'http://127.0.0.1:8000';

/*
 * Testing on MAINNET
 * - Run node on terminal: yarn run node
 * - Uncomment section below
 */
const network = Network.MAINNET;
const blockNumber = 15496800;
const holderAddress = '0xec576a26335de1c360d2fc9a68cba6ba37af4a13';
const { ALCHEMY_URL: jsonRpcUrl } = process.env;
const rpcUrl = 'http://127.0.0.1:8545';

const { ethers } = hardhat;
const MAX_GAS_LIMIT = 8e6;
const provider = new ethers.providers.JsonRpcProvider(rpcUrl, network);
const addresses = ADDRESSES[network];
const fromPool = {
  id: addresses.bbausd1.id,
  address: addresses.bbausd1.address,
  gauge: addresses.bbausd1.gauge,
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

const reset = async () =>
  provider.send('hardhat_reset', [
    {
      forking: {
        jsonRpcUrl,
        blockNumber,
      },
    },
  ]);

describe('bbausd migration execution', async () => {
  let signer: JsonRpcSigner;
  let signerAddress: string;
  let authorisation: string;
  let balance: BigNumber;
  let pool: PoolWithMethods;

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

    const sdk = new BalancerSDK({
      network,
      rpcUrl,
    });
    const { pools } = sdk;
    await pools.findBy('address', fromPool.address).then((res) => {
      if (!res) throw new BalancerError(BalancerErrorCode.POOL_DOESNT_EXIST);
      pool = res;
    });
  });

  async function testFlow(
    staked: boolean,
    authorised = true,
    minOutBuffer: string
  ): Promise<string> {
    const addressIn = staked ? fromPool.gauge : fromPool.address;
    const addressOut = staked ? toPool.gauge : toPool.address;
    // Store balance before migration
    const before = {
      from: await getErc20Balance(addressIn, provider, signerAddress),
      to: await getErc20Balance(addressOut, provider, signerAddress),
    };

    const amount = before.from;

    let query = migrations.bbaUsd(
      signerAddress,
      amount.toString(),
      '0',
      staked,
      pool.tokens
        .filter((token) => token.symbol !== 'bb-a-USD') // Note that bbausd is removed
        .map((token) => {
          const parsedBalance = parseFixed(token.balance, token.decimals);
          const parsedPriceRate = parseFixed(token.priceRate as string, 18);
          return parsedBalance.mul(WeiPerEther).div(parsedPriceRate).toString();
        }),
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

    query = migrations.bbaUsd(
      signerAddress,
      amount.toString(),
      BigNumber.from(bptOut).add(minOutBuffer).toString(),
      staked,
      pool.tokens
        .filter((token) => token.symbol !== 'bb-a-USD') // Note that bbausd is removed
        .map((token) => {
          const parsedBalance = parseFixed(token.balance, token.decimals);
          const parsedPriceRate = parseFixed(token.priceRate as string, 18);
          return parsedBalance.mul(WeiPerEther).div(parsedPriceRate).toString();
        }),
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
    expect(BigNumber.from(bptOut).gt(0)).to.be.true;
    expect(after.from.toString()).to.eq('0');
    expect(after.to.gte(bptOut)).to.be.true;
    return bptOut;
  }

  context('staked', async () => {
    beforeEach(async function () {
      // Stake them
      await stake(signer, fromPool.address, fromPool.gauge, balance);
    });

    it('should transfer tokens from stable to boosted - using exact bbausd2AmountOut from static call', async () => {
      await testFlow(true, undefined, '0');
    });

    it('should transfer tokens from stable to boosted - limit should fail', async () => {
      let errorMessage = '';
      try {
        await testFlow(true, true, '1000000000000000000');
      } catch (error) {
        errorMessage = (error as Error).message;
      }
      expect(errorMessage).to.contain('BAL#507'); // SWAP_LIMIT - Swap violates user-supplied limits (min out or max in)
    });
  });

  context('not staked', async () => {
    it('should transfer tokens from stable to boosted - using exact bbausd2AmountOut from static call', async () => {
      await testFlow(false, undefined, '0');
    });

    it('should transfer tokens from stable to boosted - limit should fail', async () => {
      let errorMessage = '';
      try {
        await testFlow(false, true, '1000000000000000000');
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
      await testFlow(false, false, '0');
    });

    it('should transfer tokens from stable to boosted - auhtorisation should fail', async () => {
      let errorMessage = '';
      try {
        await testFlow(false, false, '0');
      } catch (error) {
        errorMessage = (error as Error).message;
      }
      expect(errorMessage).to.contain('BAL#503'); // USER_DOESNT_ALLOW_RELAYER - Relayers must be allowed by both governance and the user account
    });
  });
});
