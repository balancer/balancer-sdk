import { expect } from 'chai';
import {
  BalancerSDK,
  Network,
  truncateAddresses,
  subSlippage,
  removeItem,
} from '@/.';
import { BigNumber } from '@ethersproject/bignumber';
import { JsonRpcProvider, JsonRpcSigner } from '@ethersproject/providers';
import {
  TxResult,
  accuracy,
  forkSetup,
  sendTransactionGetBalances,
  FORK_NODES,
  RPC_URLS,
  createSubgraphQuery,
} from '@/test/lib/utils';
import { Relayer } from '@/modules/relayer/relayer.module';
import { SimulationType } from '../simulation/simulation.module';
import { GeneralisedExitOutput, ExitInfo } from '../exits/exits.module';

export interface Pool {
  id: string;
  address: string;
  slot: number;
}

export const testFlow = async (
  pool: Pool,
  slippage: string,
  exitAmount: string,
  expectToUnwrap: string[],
  network: Network,
  blockNumber: number,
  poolAddressesToConsider: string[]
): Promise<{
  expectedAmountsOut: string[];
  gasUsed: BigNumber;
}> => {
  const { sdk, signer } = await setUpForkAndSdk(
    network,
    blockNumber,
    poolAddressesToConsider,
    [pool.address],
    [pool.slot],
    [exitAmount]
  );
  // Follows similar flow to a front end implementation
  const { exitOutput, txResult, exitInfo } = await userFlow(
    pool,
    sdk,
    signer,
    exitAmount,
    slippage
  );
  const tokensOutDeltas = removeItem(txResult.balanceDeltas, 0);
  console.table({
    tokensOut: truncateAddresses(exitOutput.tokensOut),
    estimateAmountsOut: exitInfo.estimatedAmountsOut,
    minAmountsOut: exitOutput.minAmountsOut,
    expectedAmountsOut: exitOutput.expectedAmountsOut,
    balanceDeltas: tokensOutDeltas.map((b) => b.toString()),
  });
  console.log('Gas used', txResult.gasUsed.toString());
  console.log(`Tokens to unwrap: `, exitInfo.tokensToUnwrap);

  expect(txResult.transactionReceipt.status).to.eq(1);
  expect(txResult.balanceDeltas[0].toString()).to.eq(exitAmount.toString());
  expect(exitInfo.tokensToUnwrap).to.deep.eq(expectToUnwrap);
  tokensOutDeltas.forEach((b, i) => {
    const minOut = BigNumber.from(exitOutput.minAmountsOut[i]);
    expect(b.gte(minOut)).to.be.true;
    expect(
      accuracy(b, BigNumber.from(exitOutput.expectedAmountsOut[i]))
    ).to.be.closeTo(1, 1e-2); // inaccuracy should be less than 1%
  });
  const expectedMins = exitOutput.expectedAmountsOut.map((a) =>
    subSlippage(BigNumber.from(a), BigNumber.from(slippage)).toString()
  );
  expect(expectedMins).to.deep.eq(exitOutput.minAmountsOut);
  return {
    expectedAmountsOut: exitOutput.expectedAmountsOut,
    gasUsed: txResult.gasUsed,
  };
};

async function userFlow(
  pool: Pool,
  sdk: BalancerSDK,
  signer: JsonRpcSigner,
  exitAmount: string,
  slippage: string
): Promise<{
  exitOutput: GeneralisedExitOutput;
  exitInfo: ExitInfo;
  txResult: TxResult;
}> {
  const signerAddress = await signer.getAddress();
  // Replicating UI user flow:
  // 1. Gets exitInfo
  //    - this helps user to decide if they will approve relayer, etc by returning estimated amounts out/pi.
  //    - also returns tokensOut and whether or not unwrap should be used
  const exitInfo = await sdk.pools.getExitInfo(
    pool.id,
    exitAmount,
    signerAddress,
    signer
  );
  const authorisation = await Relayer.signRelayerApproval(
    sdk.contracts.relayer.address,
    signerAddress,
    signer,
    sdk.contracts.vault
  );
  // 2. Get call data and expected/min amounts out
  //    - Uses a Static/Tenderly call to simulate tx then applies slippage
  const output = await sdk.pools.generalisedExit(
    pool.id,
    exitAmount,
    signerAddress,
    slippage,
    signer,
    SimulationType.Static,
    authorisation,
    exitInfo.tokensToUnwrap
  );
  // 3. Sends tx
  const txResult = await sendTransactionGetBalances(
    [pool.address, ...output.tokensOut],
    signer,
    signerAddress,
    output.to,
    output.encodedCall
  );
  return {
    exitOutput: output,
    txResult,
    exitInfo,
  };
}

async function setUpForkAndSdk(
  network: Network,
  blockNumber: number,
  pools: string[],
  tokens: string[],
  slots: number[],
  balances: string[]
): Promise<{
  sdk: BalancerSDK;
  signer: JsonRpcSigner;
}> {
  // // Uncomment and set tenderlyConfig on sdk instantiation in order to test using tenderly simulations
  // const tenderlyConfig = {
  //   accessKey: process.env.TENDERLY_ACCESS_KEY as string,
  //   user: process.env.TENDERLY_USER as string,
  //   project: process.env.TENDERLY_PROJECT as string,
  //   blockNumber,
  // };

  // Only queries minimal set of addresses
  const subgraphQuery = createSubgraphQuery(pools, blockNumber);

  const sdk = new BalancerSDK({
    network,
    rpcUrl: RPC_URLS[network],
    subgraphQuery,
  });
  const provider = new JsonRpcProvider(RPC_URLS[network], network);
  const signer = provider.getSigner();

  await forkSetup(
    signer,
    tokens,
    slots,
    balances,
    FORK_NODES[network],
    blockNumber
  );
  return { sdk, signer };
}
