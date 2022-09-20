// import dotenv from 'dotenv';
// import { expect } from 'chai';
// import { BalancerSDK, Network, Pool } from '@/.';
// import hardhat from 'hardhat';

// import { BigNumber, parseFixed } from '@ethersproject/bignumber';
// import { getErc20Balance } from '@/test/lib/utils';
// import { Pools } from '@/modules/pools';

// import composableStablePoolData from '@/test/lib/composableStable.json';
// import { parseEther } from '@ethersproject/units';

// dotenv.config();

// const { ALCHEMY_URL: jsonRpcUrl } = process.env;
// const { ethers } = hardhat;

// const rpcUrl = 'http://127.0.0.1:8545';
// const network = Network.MAINNET;
// const { networkConfig } = new BalancerSDK({ network, rpcUrl });

// const provider = new ethers.providers.JsonRpcProvider(rpcUrl, network);
// const holder = '0xbD32811d7906154b28041efaE0B16537967e36cb';

// const slippage = '100';

// const pool = composableStablePoolData as unknown as Pool;
// const controller = Pools.wrap(pool, networkConfig);

// describe('exit execution', async () => {
//   let bptIn = BigNumber.from(0);

//   // Setup chain state
//   before(async function () {
//     await provider.send('hardhat_reset', [
//       {
//         forking: {
//           jsonRpcUrl,
//           blockNumber: 15575845, // match state in the json file
//         },
//       },
//     ]);

//     // bptIn = await getErc20Balance(pool.address, provider, holder);
//     // console.log(bptIn);
//     // setTokenBalance(signerAddress, provider, pool.address, 0, initialBalance);
//   });

//   // after(() => provider.send('hardhat_stopImpersonatingAccount', [holder]));

//   it('works', async () => {
//     const amountsOut = pool.tokens.map((t) =>
//       t.address === pool.address ? '0' : parseFixed('1', t.decimals).toString()
//     );

//     const { to, data } = controller.buildExitExactTokensOut(
//       holder,
//       pool.tokens.map((t) => t.address),
//       amountsOut,
//       slippage
//     );

//     const signer = await ethers.getImpersonatedSigner(holder);
//     const transactionResponse = await signer.sendTransaction({ to, data });
//     const transactionReceipt = await transactionResponse.wait();
//     await provider.send('hardhat_stopImpersonatingAccount', [holder]);

//     console.log(transactionReceipt);
//   });
// });
