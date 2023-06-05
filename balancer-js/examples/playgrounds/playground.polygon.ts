import dotenv from 'dotenv';
dotenv.config();

import { Network } from '@/types';
import { JsonRpcProvider } from '@ethersproject/providers';
import { BalancerSDK } from '@/modules/sdk.module';
import { formatFixed, parseFixed } from '@ethersproject/bignumber';
import { SimulationType } from '@/modules/simulation/simulation.module';
import { Contracts } from '@/modules/contracts/contracts.module';
import { Relayer } from '@/modules/relayer/relayer.module';
import { forkSetup, sendTransactionGetBalances } from '@/test/lib/utils';
import { removeItem, truncateAddresses } from '@/lib/utils';

const playground = async () => {
  const jsonRpcUrl = process.env.ALCHEMY_URL_POLYGON;
  const rpcUrl = 'http://127.0.0.1:8137';
  const network = Network.POLYGON;
  const provider = new JsonRpcProvider(rpcUrl, network);
  const signer = provider.getSigner();
  const signerAddress = await signer.getAddress();

  const poolId =
    '0x4a77ef015ddcd972fd9ba2c7d5d658689d090f1a000000000000000000000b38';
  const sdk = new BalancerSDK({ rpcUrl, network });
  await forkSetup(
    signer,
    ['0x4a77ef015ddcd972fd9ba2c7d5d658689d090f1a'],
    [0],
    [parseFixed('10', 18).toString()],
    jsonRpcUrl as string,
    43459020
  );

  const { contracts, contractAddresses } = new Contracts(
    network as number,
    provider
  );
  const relayerAuth = await Relayer.signRelayerApproval(
    contractAddresses.relayer,
    signerAddress,
    signer,
    contracts.vault
  );
  const bptAmount = parseFixed('1.05391658378102474', 18).toString();
  const { estimatedAmountsOut, tokensOut, tokensToUnwrap } =
    await sdk.pools.getExitInfo(poolId, bptAmount, signerAddress, signer);
  console.log('estimatedAmountsOut: ' + estimatedAmountsOut);
  console.log('tokensOut: ' + tokensOut);
  console.log(relayerAuth);
  const query = await sdk.pools.generalisedExit(
    poolId,
    bptAmount,
    signerAddress,
    '50',
    signer,
    SimulationType.Static,
    '',
    tokensToUnwrap
  );
  const { balanceDeltas } = await sendTransactionGetBalances(
    ['0x4a77ef015ddcd972fd9ba2c7d5d658689d090f1a', ...query.tokensOut],
    signer,
    signerAddress,
    query.to,
    query.encodedCall
  );

  console.log(' -- Simulating using Static Call -- ');
  console.log('Price impact: ', formatFixed(query.priceImpact, 18));
  console.log(`Amount Pool Token In: ${balanceDeltas[0].toString()}`);
  console.table({
    tokensOut: truncateAddresses(query.tokensOut),
    minAmountsOut: query.minAmountsOut,
    expectedAmountsOut: query.expectedAmountsOut,
    balanceDeltas: removeItem(balanceDeltas, 0).map((b) => b.toString()),
  });
};

playground();
