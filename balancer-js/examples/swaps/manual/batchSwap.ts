/**
 * Example showing how to manually encode and send a batch swap transaction.
 * Uses local fork of mainnet: $ yarn run node
 * 
 * Run with:
 * yarn example ./examples/swaps/manual/batchSwap.ts
 */

import { BalancerSDK, Network, SwapType, Swaps } from '@balancer-labs/sdk';
import { AddressZero } from '@ethersproject/constants';
import { formatUnits, parseEther } from '@ethersproject/units';

async function runBatchSwap() {
  const sdk = new BalancerSDK({
    network: Network.MAINNET,
    rpcUrl: 'http://127.0.0.1:8545'
  });

  const { provider, contracts } = sdk;
  const signer = provider.getSigner();
  const address = await signer.getAddress();
  const value = String(parseEther('20'));

  const encodedBatchSwapData = Swaps.encodeBatchSwap({
    kind: SwapType.SwapExactIn,
    swaps: [
      // First pool swap: 10 ETH > USDC
      {
        poolId:
          '0x96646936b91d6b9d7d0c47c496afbf3d6ec7b6f8000200000000000000000019',
        // ETH
        assetInIndex: 0,
        // USDC
        assetOutIndex: 1,
        amount: String(parseEther('10')),
        userData: '0x',
      },
      // Second pool swap: 10 ETH > BAL
      {
        poolId:
          '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014',
        // ETH
        assetInIndex: 0,
        // BAL
        assetOutIndex: 2,
        amount: String(parseEther('10')),
        userData: '0x',
      },
    ],
    assets: [
      // Balancer use the zero address for ETH and the Vault will wrap/unwrap as neccessary
      AddressZero,
      // USDC
      '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      // BAL
      '0xba100000625a3754423978a60c9317c58a424e3d'
    ],
    funds: {
      fromInternalBalance: false,
      // These can be different addresses!
      recipient: address,
      sender: address,
      toInternalBalance: false,
    },
    limits: [value, '0', '0'], // +ve for max to send, -ve for min to receive
    deadline: '999999999999999999', // Infinity
  });

  const usdc = contracts.ERC20('0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', provider);
  const bal = contracts.ERC20('0xba100000625a3754423978a60c9317c58a424e3d', provider);

  let ethBalance = await signer.getBalance();
  let usdcBalance = await usdc.balanceOf(address);
  let balBalance = await bal.balanceOf(address);

  console.log(`Balances before: `);
  console.log(`ETH: ${formatUnits(ethBalance, 18)}`);
  console.log(`USDC: ${formatUnits(usdcBalance, 6)}`);
  console.log(`BAL: ${formatUnits(balBalance, 18)}`);

  await signer.sendTransaction({
    data: encodedBatchSwapData,
    to: contracts.vault.address,
    value
    /**
     * The following gas inputs are optional,
     **/
    // gasPrice: '6000000000',
    // gasLimit: '2000000',
  });

  ethBalance = await signer.getBalance();
  usdcBalance = await usdc.balanceOf(address);
  balBalance = await bal.balanceOf(address);

  console.log(`Balances after: `);
  console.log(`ETH: ${formatUnits(ethBalance, 18)}`);
  console.log(`USDC: ${formatUnits(usdcBalance, 6)}`);
  console.log(`BAL: ${formatUnits(balBalance, 18)}`)
}

runBatchSwap();
