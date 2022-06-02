import dotenv from 'dotenv';
import { defaultAbiCoder } from '@ethersproject/abi';
import { Wallet } from '@ethersproject/wallet';
import { JsonRpcProvider } from '@ethersproject/providers';
import { Contract } from '@ethersproject/contracts';
import {
  BalancerSDK,
  BalancerSdkConfig,
  Network,
  StablePoolEncoder,
} from '../src/index';
import { AAVE_DAI, AAVE_USDT, bbausd } from './constants';

import balancerRelayerAbi from '../src/lib/abi/BalancerRelayer.json';

dotenv.config();

/*
Example showing how to use Relayer to chain exitPool followed by batchSwaps using tokens from exit.
User must approve relayer.
Vault must have approvals for tokens.
*/
async function relayerExitPoolAndBatchSwap() {
  const config: BalancerSdkConfig = {
    network: Network.KOVAN,
    rpcUrl: `https://kovan.infura.io/v3/${process.env.INFURA}`,
  };

  const provider = new JsonRpcProvider(config.rpcUrl);
  const key: any = process.env.TRADER_KEY;
  const relayerAddress = '0x3C255DE4a73Dd251A33dac2ab927002C964Eb2cB';
  const wallet = new Wallet(key, provider);

  const balancer = new BalancerSDK(config);

  /*
    This creates pool request for exactTokensOut.
    Here minAmoutsOut is known because it just matches the exact out amounts.
    maxBptIn should set to a known amount based on pool balances, etc.
    */
  // const exactPoolTokensOut = ['100000', '100000000000000000'];
  // const expectedAmountsOut = exactPoolTokensOut;
  // const maxBptIn = MaxUint256;
  // const userData = StablePoolEncoder.exitBPTInForExactTokensOut(
  //     exactPoolTokensOut,
  //     maxBptIn
  // );

  /*
    This creates pool request for exactBPTIn.
    expectedAmountsOut should be set to a known/realistic value as this is used to estimate swap/limit amounts and can cause issues if off.
    */
  const bptAmountIn = '2049658696117824796';
  const expectedAmountsOut = ['1019700', '1029989699999948233'];
  const userData = StablePoolEncoder.exitExactBPTInForTokensOut(bptAmountIn);

  const txInfo = await balancer.relayer.exitPoolAndBatchSwap({
    exiter: wallet.address, // exiter is address that holds BPT used to exit pool
    swapRecipient: wallet.address, // recipient is address that receives final tokens
    poolId:
      '0xf5f6fb82649df7991054ef796c39da81b93364df0002000000000000000004a5', // USDT/DAI pool
    exitTokens: [AAVE_USDT.address, AAVE_DAI.address],
    userData,
    expectedAmountsOut,
    finalTokensOut: [bbausd.address, bbausd.address],
    slippage: '50000000000000000', // Slippage for swap 5%
    fetchPools: {
      fetchPools: true,
      fetchOnChain: false,
    },
  });

  console.log(`Amounts of tokensOut:`);
  console.log(txInfo.outputs?.amountsOut?.toString());

  const relayerContract = new Contract(
    relayerAddress,
    balancerRelayerAbi,
    provider
  );
  const tx = await relayerContract
    .connect(wallet)
    .callStatic[txInfo.function](txInfo.params, {
      value: '0',
      // gasPrice: '6000000000',
      // gasLimit: '2000000',
    });

  console.log(`Swap Deltas:`);
  console.log(defaultAbiCoder.decode(['int256[]'], tx[1]).toString());
}

// yarn examples:run ./examples/relayerExitPoolAndBatchSwap.ts
relayerExitPoolAndBatchSwap();
