import dotenv from 'dotenv';
import { expect } from 'chai';
import hardhat from 'hardhat';

import { BalancerSDK, Network, RelayerAuthorization } from '@/.';
import { parseFixed } from '@ethersproject/bignumber';
import { Contracts } from '@/modules/contracts/contracts.module';
import { JsonRpcSigner } from '@ethersproject/providers';
import { MaxUint256 } from '@ethersproject/constants';
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
const network = Network.GOERLI;
const blockNumber = 7577109;
const subgraph = `https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-goerli-v2-beta`;
const bbausd2id =
  '0x3d5981bdd8d3e49eb7bbdc1d2b156a3ee019c18e0000000000000000000001a7';
const bbausd2address = '0x3d5981bdd8d3e49eb7bbdc1d2b156a3ee019c18e';
const bbadai = '0x594920068382f64e4bc06879679bd474118b97b1';

/*
 * Testing on MAINNET
 * - Update hardhat.config.js with chainId = 1
 * - Update ALCHEMY_URL on .env with a mainnet api key
 * - Run node on terminal: yarn run node
 * - Uncomment section below:
 */
// const network = Network.MAINNET;
// const blockNumber = 15519886;
// const subgraph = `https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-v2-beta`;
// const bbausd2id =
//   '0xa13a9247ea42d743238089903570127dda72fe4400000000000000000000035d';
// const bbausd2address = '0xa13a9247ea42d743238089903570127dda72fe44';
// const bbadai = '0xae37d54ae477268b9997d4161b96b8200755935c';

dotenv.config();

const { ALCHEMY_URL: jsonRpcUrl } = process.env;
const { ethers } = hardhat;
const MAX_GAS_LIMIT = 8e6;

const rpcUrl = 'http://127.0.0.1:8545';
const sdk = new BalancerSDK({
  network,
  rpcUrl,
  customSubgraphUrl: subgraph,
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
  id: bbausd2id,
  address: bbausd2address,
};
const mainTokens = [addresses.DAI.address, addresses.USDC.address];
// joins with wrapping require token approvals. These are taken care of as part of fork setup when wrappedTokens passed in.
const wrappedTokensIn = [
  addresses.waUSDT.address,
  addresses.waDAI.address,
  addresses.waUSDC.address,
];
const linearPoolTokens = [bbadai];
const slots = [addresses.DAI.slot, addresses.USDC.slot];
const wrappedSlots = [
  addresses.waUSDT.slot,
  addresses.waDAI.slot,
  addresses.waUSDC.slot,
];
const linearPoolSlots = [0];
const mainInitialBalances = [
  parseFixed('100', addresses.DAI.decimals).toString(),
  parseFixed('100', addresses.USDC.decimals).toString(),
];
const wrappedInitialBalances = ['0', '0', '0'];
const linearInitialBalances = [parseFixed('100', 18).toString()];

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

  beforeEach(async function () {
    signerAddress = await signer.getAddress();

    await forkSetup(
      signer,
      [...mainTokens, ...wrappedTokensIn, ...linearPoolTokens],
      [...slots, ...wrappedSlots, ...linearPoolSlots],
      [
        ...mainInitialBalances,
        ...wrappedInitialBalances,
        ...linearInitialBalances,
      ],
      jsonRpcUrl as string,
      blockNumber
    );

    authorisation = await signRelayerApproval(relayer, signerAddress, signer);
  });

  const testFlow = async (
    tokensIn: string[],
    amountIn: string[],
    wrapMainTokens: boolean,
    previouslyAuthorised = false
  ) => {
    const [bptBalanceBefore, ...tokensBalanceBefore] = await getBalances(
      [fromPool.address, ...tokensIn],
      signer,
      signerAddress
    );

    const gasLimit = MAX_GAS_LIMIT;
    const slippage = '0';

    const query = await pools.generalisedJoin(
      fromPool.id,
      tokensIn,
      amountIn,
      signerAddress,
      wrapMainTokens,
      slippage,
      previouslyAuthorised ? undefined : authorisation
    );

    const response = await signer.sendTransaction({
      to: query.to,
      data: query.callData,
      gasLimit,
    });

    const receipt = await response.wait();
    console.log('Gas used', receipt.gasUsed.toString());

    const [bptBalanceAfter, ...tokensBalanceAfter] = await getBalances(
      [fromPool.address, ...tokensIn],
      signer,
      signerAddress
    );

    expect(receipt.status).to.eql(1);
    expect(bptBalanceBefore.eq(0)).to.be.true;
    // tokensBalanceBefore.forEach(
    //   (b, i) => expect(b.eq(mainInitialBalances[i])).to.be.true
    // );
    tokensBalanceAfter.forEach((b) => expect(b.toString()).to.eq('0'));
    console.log(bptBalanceAfter.toString());
    console.log(query.minOut);
    expect(bptBalanceAfter.gte(query.minOut)).to.be.true;
  };
  context('leaf token input', async () => {
    it('joins with no wrapping', async () => {
      await testFlow(mainTokens, mainInitialBalances, false);
    }).timeout(2000000);
    it('joins with wrapping', async () => {
      await testFlow(mainTokens, mainInitialBalances, true);
    });
  });
  context('linear pool token as input', async () => {
    it('joins boosted pool', async () => {
      await testFlow(linearPoolTokens, linearInitialBalances, false);
    });
  });

  context('leaf and linear pool token as input', async () => {
    it('joins boosted pool', async () => {
      await testFlow(
        [mainTokens[1], linearPoolTokens[0]],
        [mainInitialBalances[1], linearInitialBalances[0]],
        false
      );
    });
  });
});
