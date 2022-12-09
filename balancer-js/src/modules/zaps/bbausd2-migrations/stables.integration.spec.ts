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
const addresses = ADDRESSES[network];
const blockNumber = 7300090;
const holderAddress = '0xd86a11b0c859c18bfc1b4acd072c5afe57e79438';
const { ALCHEMY_URL_GOERLI: jsonRpcUrl } = process.env;
const rpcUrl = 'http://127.0.0.1:8000';
// stabal3
const fromPool = {
  id: addresses.staBal3.id,
  address: addresses.staBal3.address,
  gauge: addresses.staBal3.gauge,
};
// new stabal3
const toPool = {
  id: addresses.staBal3_2.id,
  address: addresses.staBal3_2.address,
  gauge: addresses.staBal3_2.gauge,
};
const tokens = [addresses.USDT, addresses.DAI, addresses.USDC]; // this order only works for testing with Goerli - change order to test on Mainnet

/*
 * Testing on POLYGON
 * - Run node on terminal: yarn run node
 * - Uncomment section below
 */
// const network = Network.POLYGON;
// const addresses = ADDRESSES[network];
// const blockNumber = 32856000;
// const holderAddress = '0x8df33a75e5cc9d71db97fb1248cc8bdac316fe09';
// // MaticX
// const fromPool = {
//   id: '0xc17636e36398602dd37bb5d1b3a9008c7629005f0002000000000000000004c4',
//   address: '0xc17636e36398602dd37bb5d1b3a9008c7629005f',
//   gauge: '0x48534d027f8962692122db440714ffe88ab1fa85',
// };
// // new MaticX
// const toPool = {
//   id: '0xb20fc01d21a50d2c734c4a1262b4404d41fa7bf000000000000000000000075c',
//   address: '0xb20fc01d21a50d2c734c4a1262b4404d41fa7bf0',
//   gauge: '0xdffe97094394680362ec9706a759eb9366d804c2',
// };
// const tokens = [
//   '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', // wMATIC
//   '0xfa68FB4628DFF1028CFEc22b4162FCcd0d45efb6', // MaticX
// ];
// const holderAddress = '0x70d04384b5c3a466ec4d8cfb8213efc31c6a9d15';
// // stMATIC
// const fromPool = {
//   id: '0xaf5e0b5425de1f5a630a8cb5aa9d97b8141c908d000200000000000000000366',
//   address: '0xaf5e0b5425de1f5a630a8cb5aa9d97b8141c908d',
//   gauge: '0x9928340f9e1aaad7df1d95e27bd9a5c715202a56',
// };
// // new stMATIC
// const toPool = {
//   id: '0x8159462d255c1d24915cb51ec361f700174cd99400000000000000000000075d',
//   address: '0x8159462d255c1d24915cb51ec361f700174cd994',
//   gauge: '0x2aa6fb79efe19a3fce71c46ae48efc16372ed6dd',
// };
// const tokens = [
//   '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', // wMATIC
//   '0x3a58a54c066fdc0f2d55fc9c89f0415c92ebf3c4', // stMATIC
// ];
// const { ALCHEMY_URL: jsonRpcUrl } = process.env;
// const rpcUrl = 'http://127.0.0.1:8545';

const { ethers } = hardhat;
const MAX_GAS_LIMIT = 8e6;

const provider = new ethers.providers.JsonRpcProvider(rpcUrl, network);
const relayer = addresses.relayer;
const { contracts } = new Contracts(network as number, provider);
const migrations = new Migrations(network);

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

describe('stables migration execution', async () => {
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

  const testFlow = async (
    staked: boolean,
    authorised = true,
    minBptOut: undefined | string = undefined
  ) => {
    const addressIn = staked ? fromPool.gauge : fromPool.address;
    const addressOut = staked ? toPool.gauge : toPool.address;
    // Store balance before migration
    const before = {
      from: await getErc20Balance(addressIn, provider, signerAddress),
      to: await getErc20Balance(addressOut, provider, signerAddress),
    };

    let query = migrations.stables(
      signerAddress,
      fromPool,
      toPool,
      before.from.toString(),
      '0',
      staked,
      tokens,
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

    query = migrations.stables(
      signerAddress,
      fromPool,
      toPool,
      before.from.toString(),
      minBptOut ? minBptOut : bptOut,
      staked,
      tokens,
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

    const diffs = {
      from: after.from.sub(before.from),
      to: after.to.sub(before.to),
    };

    console.log(diffs.from, diffs.to);

    expect(BigNumber.from(bptOut).gt(0)).to.be.true;
    expect(after.from.toString()).to.eq('0');
    expect(after.to.toString()).to.eq(bptOut);
    return bptOut;
  };

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
      // Store balance before migration
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
