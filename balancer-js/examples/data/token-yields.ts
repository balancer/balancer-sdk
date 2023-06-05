/**
 * Display token yields
 * Run command: yarn example ./examples/data/token-yields.ts
 */
import { BalancerSDK } from '@/modules/sdk.module';
import { yieldTokens } from '@/modules/data/token-prices/aave-rates';

const sdk = new BalancerSDK({ network: 1, rpcUrl: '' });
const { data } = sdk;

const tokens = [
  yieldTokens[1].waDAI,
  '0x9559aaa82d9649c7a7b220e7c461d2e74c9a3593', // rETH (stafi)
  '0x93ef1ea305d11a9b2a3ebb9bb4fcc34695292e7d', // qETH
  '0xae7ab96520de3a18e5e111b5eaab095312d7fe84', // stETH
  '0xac3e018457b222d93114458476f3e3416abbe38f', // sfrxETH
  '0x3a58a54c066fdc0f2d55fc9c89f0415c92ebf3c4', // stMatic (polygon)
  '0xfa68fb4628dff1028cfec22b4162fccd0d45efb6', // maticX (polygon)
  '0xaf0d9d65fc54de245cda37af3d18cbec860a4d4b', // USDR
  '0xeb91861f8a4e1c12333f42dce8fb0ecdc28da716', // eUSDC
  '0x5484451a88a35cd0878a1be177435ca8a0e4054e', // eFRAX
  '0xc411dB5f5Eb3f7d552F9B8454B2D74097ccdE6E3', // dUSDC
  '0x6CFaF95457d7688022FC53e7AbE052ef8DFBbdBA', // dDAI
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
