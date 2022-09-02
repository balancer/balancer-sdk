import dotenv from 'dotenv';
import { expect } from 'chai';
import hardhat from 'hardhat';

import { BalancerSDK, Network, RelayerAuthorization } from '@/.';
import { BigNumber, parseFixed } from '@ethersproject/bignumber';
import { Contracts } from '@/modules/contracts/contracts.module';
import { JsonRpcSigner } from '@ethersproject/providers';
import { MaxInt256, MaxUint256 } from '@ethersproject/constants';
import { forkSetup, getBalances } from '@/test/lib/utils';
import { ADDRESSES } from '@/test/lib/constants';

/*
 * Testing on GOERLI
 * - Update hardhat.config.js with chainId = 5
 * - Update ALCHEMY_URL on .env with a goerli api key
 * - Run node on terminal: yarn run node
 * - Uncomment section below:
 */
// const network = Network.GOERLI;
// const poolId =
//   '0x13acd41c585d7ebb4a9460f7c8f50be60dc080cd00000000000000000000005f';
// const blockNumber = 7452900;

/*
 * Testing on MAINNET
 * - Update hardhat.config.js with chainId = 1
 * - Update ALCHEMY_URL on .env with a mainnet api key
 * - Run node on terminal: yarn run node
 * - Uncomment section below:
 */
const network = Network.MAINNET;
const blockNumber = 15372650;

dotenv.config();

const { ALCHEMY_URL: jsonRpcUrl } = process.env;
const { ethers } = hardhat;
const MAX_GAS_LIMIT = 8e6;

const rpcUrl = 'http://127.0.0.1:8545';
const sdk = new BalancerSDK({
  network,
  rpcUrl,
  customSubgraphUrl: `https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-v2-beta`,
});
const { pools } = sdk;
const provider = new ethers.providers.JsonRpcProvider(rpcUrl, network);
const signer = provider.getSigner();
const { contracts, contractAddresses } = new Contracts(
  network as number,
  provider
);
const relayer = contractAddresses.relayer as string;
const addresses = ADDRESSES[network];
const fromPool = {
  id: '0x9b532ab955417afd0d012eb9f7389457cd0ea712000000000000000000000338', // bbausd2
  address: addresses.bbausd2.address,
};
const tokensIn = [
  addresses.USDT.address,
  addresses.DAI.address,
  addresses.USDC.address,
];
const wrappedTokensIn = [
  addresses.waUSDT.address,
  addresses.waDAI.address,
  addresses.waUSDC.address,
];
const slots = [addresses.USDT.slot, addresses.DAI.slot, addresses.USDC.slot];
const wrappedSlots = [
  addresses.waUSDT.slot,
  addresses.waDAI.slot,
  addresses.waUSDC.slot,
];
const initialBalances = [
  parseFixed('0', addresses.USDT.decimals).toString(),
  parseFixed('100', addresses.DAI.decimals).toString(),
  parseFixed('100', addresses.USDC.decimals).toString(),
];
const wrappedInitialBalances = ['0', '0', '0'];

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

describe('bbausd generalised join execution', async () => {
  let signerAddress: string;
  let authorisation: string;
  let bptBalanceBefore: BigNumber;
  let bptBalanceAfter: BigNumber;
  let tokensBalanceBefore: BigNumber[];
  let tokensBalanceAfter: BigNumber[];

  beforeEach(async function () {
    this.timeout(20000);

    signerAddress = await signer.getAddress();

    await forkSetup(
      signer,
      [...tokensIn, ...wrappedTokensIn],
      [...slots, ...wrappedSlots],
      [...initialBalances, ...wrappedInitialBalances],
      jsonRpcUrl as string,
      blockNumber
    );

    authorisation = await signRelayerApproval(relayer, signerAddress, signer);
  });

  const testFlow = async (
    previouslyAuthorised = false,
    minBptOut: undefined | string = undefined
  ) => {
    // TODO - Add cases for wrapped and non-wrapped
    const wrapMainTokens = true;

    [bptBalanceBefore, ...tokensBalanceBefore] = await getBalances(
      [fromPool.address, ...tokensIn],
      signer,
      signerAddress
    );

    const gasLimit = MAX_GAS_LIMIT;

    // let query = await pool.generalisedJoin(
    //   '0',
    //   tokensIn,
    //   tokensBalanceBefore.map((b) => b.toString()),
    //   signerAddress,
    //   authorisation
    // );
    // Static call can be used to simulate tx and get expected BPT in/out deltas
    // const staticResult = await signer.call({
    //   to: query.to,
    //   data: query.data,
    // });
    // const bptOut = query.decode(staticResult); // pending implementation
    // console.log(bptOut);
    const bptOut = '0';

    const query = await pools.generalisedJoin(
      fromPool.id,
      minBptOut ? minBptOut : bptOut,
      tokensIn,
      tokensBalanceBefore.map((b) => b.toString()),
      signerAddress,
      wrapMainTokens,
      previouslyAuthorised ? undefined : authorisation
    );

    const response = await signer.sendTransaction({
      to: query.to,
      data: query.data,
      gasLimit,
    });

    const receipt = await response.wait();
    console.log('Gas used', receipt.gasUsed.toString());

    [bptBalanceAfter, ...tokensBalanceAfter] = await getBalances(
      [fromPool.address, ...tokensIn],
      signer,
      signerAddress
    );

    expect(receipt.status).to.eql(1);
    expect(bptBalanceBefore.eq(0)).to.be.true;
    expect(bptBalanceAfter.gt(0)).to.be.true;
    tokensBalanceBefore.forEach(
      (b, i) => expect(b.eq(initialBalances[i])).to.be.true
    );
    tokensBalanceAfter.forEach((b) => expect(b.eq(0)).to.be.true);
  };

  context('without minBPT limit', async () => {
    it('should transfer tokens from stable to boosted', async () => {
      await testFlow();
    }).timeout(20000);

    it('should transfer tokens from stable to boosted - limit should fail', async () => {
      let errorMessage = '';
      try {
        await testFlow(false, MaxInt256.toString());
      } catch (error) {
        errorMessage = (error as Error).message;
      }
      expect(errorMessage).to.contain('BAL#208'); // BPT_OUT_MIN_AMOUNT - BPT out below minimum expected
    }).timeout(20000);
  });
}).timeout(20000);
