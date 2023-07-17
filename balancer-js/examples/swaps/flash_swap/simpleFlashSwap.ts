/*
Example showing how to encode and send a flash swap transaction

To see a successful execution of this example on Kovan:
https://kovan.etherscan.io/tx/0x2bca23b1c98e9bfe51aa4fbdd16db8c1b81484a92486233cd9dc504116e67eb5

NB: If this fails, test first the querySimpleFlashSwap yields a profitable flashSwap

Run with:
yarn example ./examples/swaps/flash_swap/simpleFlashSwap.ts
*/

import { Swaps, BALANCER_NETWORK_CONFIG } from '@balancer-labs/sdk';
import { JsonRpcProvider } from '@ethersproject/providers';

const provider = new JsonRpcProvider('http://127.0.0.1:8545/', 1);
const signer = provider.getSigner();

async function runFlashSwap() {
  try {
    const walletAddress = await signer.getAddress();

    const encodedBatchSwapData = Swaps.encodeSimpleFlashSwap({
      flashLoanAmount: '100',
      poolIds: [
        '0xff4ce5aaab5a627bf82f4a571ab1ce94aa365ea6000200000000000000000426',
        '0x76fcf0e8c7ff37a47a799fa2cd4c13cde0d981c90002000000000000000003d2',
      ],
      assets: [
        // usdc
        '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        // dai
        '0x6b175474e89094c44da98b954eedeac495271d0f',
      ],
      walletAddress,
    });

    const tx = await signer.sendTransaction({
      data: encodedBatchSwapData,
      to: BALANCER_NETWORK_CONFIG[1].addresses.contracts.vault,
    });

    console.log(tx);
  } catch (err) {
    console.error(err);
  }
}

runFlashSwap();
