import dotenv from 'dotenv';
import { Wallet } from '@ethersproject/wallet';
import { InfuraProvider } from '@ethersproject/providers';
import { Network, SwapType } from '../src/index';

import { Swaps } from '../src/modules/swaps/swaps.module';
import { balancerVault } from '../src/lib/constants/config';

dotenv.config();

const { TRADER_KEY } = process.env;

const RECIPIENT_WALLET_ADDRESS = '0x35f5a330FD2F8e521ebd259FA272bA8069590741';
const SENDER_WALLET_ADDRESS = '0x35f5a330FD2F8e521ebd259FA272bA8069590741';

/*
Example showing how to encode and send a batch swap transaction.
*/
async function runBatchSwap() {
  console.log('PRIVATE_KEY', TRADER_KEY);

  const encodedBatchSwapData = Swaps.encodeBatchSwap({
    kind: SwapType.SwapExactIn,
    swaps: [
      // First pool swap: 10000 USDC => ? DAI
      {
        poolId:
          '0x0cdab06b07197d96369fea6f3bea6efc7ecdf7090002000000000000000003de',
        // USDC
        assetInIndex: 0,
        // DAI
        assetOutIndex: 1,
        amount: '10000',
        userData: '0x',
      },
      // Second pool swap: 10000 DAI => ? USDC
      {
        poolId:
          '0x17018c2f7c345add873474879ff0ed98ebd6346a000200000000000000000642',
        // DAI
        assetInIndex: 1,
        // USDC
        assetOutIndex: 0,
        amount: '10000',
        userData: '0x',
      },
    ],
    assets: [
      // USDC
      '0xc2569dd7d0fd715b054fbf16e75b001e5c0c1115',
      // DAI
      '0x04df6e4121c27713ed22341e7c7df330f56f289b',
    ],
    funds: {
      fromInternalBalance: false,
      // These can be different addresses!
      recipient: RECIPIENT_WALLET_ADDRESS,
      sender: SENDER_WALLET_ADDRESS,
      toInternalBalance: false,
    },
    limits: ['0', '0'], // No limits
    deadline: '999999999999999999', // Infinity
  });

  const provider = new InfuraProvider(Network.KOVAN, process.env.INFURA);
  const wallet = new Wallet(TRADER_KEY as string, provider);

  const tx = await wallet.sendTransaction({
    data: encodedBatchSwapData,
    to: balancerVault,
    /**
     * The following gas inputs are optional,
     **/
    // gasPrice: '6000000000',
    // gasLimit: '2000000',
  });

  console.log(tx);
}

// yarn examples:run ./examples/batchSwap.ts
runBatchSwap();
