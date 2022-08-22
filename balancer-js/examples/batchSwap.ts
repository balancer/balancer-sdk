import dotenv from 'dotenv';
import { BalancerSDK } from '../src/index';
import { AddressZero } from '@ethersproject/constants';
import { Wallet } from '@ethersproject/wallet';
import { JsonRpcProvider } from '@ethersproject/providers';
import { Network, SwapType } from '../src/index';
import { Swaps } from '../src/modules/swaps/swaps.module';
import { balancerVault } from '../src/lib/constants/config';
import { ADDRESSES } from '../src/test/lib/constants';

dotenv.config();

/*
Example showing how to encode and send a batch swap transaction.
Uses local fork of mainnet: $ yarn run node
*/
async function runBatchSwap() {

  const rpcUrl = `http://127.0.0.1:8545`;
  const provider = new JsonRpcProvider(rpcUrl, Network.MAINNET);
  // Take TRADER_KEY from forked account
  const { TRADER_KEY } = process.env;
  const wallet = new Wallet(TRADER_KEY as string, provider);

  const encodedBatchSwapData = Swaps.encodeBatchSwap({
    kind: SwapType.SwapExactIn,
    swaps: [
      // First pool swap: 0.01ETH > USDC
      {
        poolId:
          '0x96646936b91d6b9d7d0c47c496afbf3d6ec7b6f8000200000000000000000019',
        // ETH
        assetInIndex: 0,
        // USDC
        assetOutIndex: 1,
        amount: '10000000000000000',
        userData: '0x',
      },
      // Second pool swap: 0.01ETH > BAL
      {
        poolId:
          '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014',
        // ETH
        assetInIndex: 0,
        // BAL
        assetOutIndex: 2,
        amount: '10000000000000000',
        userData: '0x',
      },
    ],
    assets: [
      // Balancer use the zero address for ETH and the Vault will wrap/unwrap as neccessary
      AddressZero,
      // USDC
      ADDRESSES[Network.MAINNET].USDC.address,
      // BAL
      ADDRESSES[Network.MAINNET].BAL.address
    ],
    funds: {
      fromInternalBalance: false,
      // These can be different addresses!
      recipient: wallet.address,
      sender: wallet.address,
      toInternalBalance: false,
    },
    limits: ['20000000000000000', '0', '0'], // +ve for max to send, -ve for min to receive
    deadline: '999999999999999999', // Infinity
  });

  const balancer = new BalancerSDK({
    network: Network.MAINNET,
    rpcUrl,
  });
  const usdcContract = balancer.contracts.ERC20(ADDRESSES[Network.MAINNET].USDC.address, provider);
  const balContract = balancer.contracts.ERC20(ADDRESSES[Network.MAINNET].BAL.address, provider);

  let ethBalance = await wallet.getBalance();
  let usdcBalance = await usdcContract.balanceOf(wallet.address);
  let balBalance = await balContract.balanceOf(wallet.address);
  console.log(`Balances before: `);
  console.log(`ETH: ${ethBalance.toString()}`);
  console.log(`USDC: ${usdcBalance.toString()}`);
  console.log(`BAL: ${balBalance.toString()}`);

  const tx = await wallet.sendTransaction({
    data: encodedBatchSwapData,
    to: balancerVault,
    value: '20000000000000000'
    /**
     * The following gas inputs are optional,
     **/
    // gasPrice: '6000000000',
    // gasLimit: '2000000',
  });

  ethBalance = await wallet.getBalance();
  usdcBalance = await usdcContract.balanceOf(wallet.address);
  balBalance = await balContract.balanceOf(wallet.address);
  console.log(`Balances after: `);
  console.log(`ETH: ${ethBalance.toString()}`);
  console.log(`USDC: ${usdcBalance.toString()}`);
  console.log(`BAL: ${balBalance.toString()}`);
}

// yarn examples:run ./examples/batchSwap.ts
runBatchSwap();
