/**
 * Display token yields
 * Run command: yarn example ./examples/data/token-yields.arbitrum.ts
 */
import { BalancerSDK } from '@/.';

const sdk = new BalancerSDK({ network: 42161, rpcUrl: '' });
const { data } = sdk;

const tokens = [
  '0x12f256109e744081f633a827be80e06d97ff7447', // reaper DAI
];

const main = async () => {
  const yields = await Promise.all(
    tokens.map((token) => data.tokenYields.find(token))
  );

  tokens.forEach((token, id) => {
    console.log(token, yields[id]);
  });
};

main();
