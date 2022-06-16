import dotenv from 'dotenv';
import { Wallet } from '@ethersproject/wallet';
import { InfuraProvider } from '@ethersproject/providers';
import { Network } from '../src/index';
import { DAI, USDC } from './constants';

import { Swaps } from '../src/modules/swaps/swaps.module';
import { balancerVault } from '../src/lib/constants/config';

dotenv.config();

const { TRADER_KEY } = process.env;

/*
Example showing how to encode and send a flash swap transaction

To see a successful execution of this example on Kovan:
https://kovan.etherscan.io/tx/0x2bca23b1c98e9bfe51aa4fbdd16db8c1b81484a92486233cd9dc504116e67eb5

NB: If this fails, test first the querySimpleFlashSwap yields a profitable flashSwap
*/
async function runFlashSwap() {
  console.log('PRIVATE_KEY', TRADER_KEY);

  const encodedBatchSwapData = Swaps.encodeSimpleFlashSwap({
    flashLoanAmount: '100',
    poolIds: [
      '0x0cdab06b07197d96369fea6f3bea6efc7ecdf7090002000000000000000003de',
      '0x17018c2f7c345add873474879ff0ed98ebd6346a000200000000000000000642',
    ],
    assets: [USDC.address, DAI.address],
    walletAddress: '0x35f5a330FD2F8e521ebd259FA272bA8069590741',
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

// yarn examples:run ./examples/simpleFlashSwap.ts
runFlashSwap();
