import { BalancerSDK, Network } from '@balancer-labs/sdk';
import { parseEther } from "@ethersproject/units";

const rpcUrl = 'http://localhost:8545';
const jsonRpcUrl = process.env.ALCHEMY_URL as string;
const test = async () => {
  const sdk = new BalancerSDK({ network: Network.MAINNET, rpcUrl });
  const {provider} = sdk;
  const signer = provider.getSigner();
  const signerAddress = await signer.getAddress();
  const poolId = '0x0bbc7b78ff8453c40718e290b33f1d00ee67274e000000000000000000000563'
  const pool = await sdk.pools.find(poolId);
  if(!pool){
    throw new Error('pool not found');
  }
  const query = await pool.buildJoin(
    signerAddress,
    ['0x1a44e35d5451e0b78621a1b3e7a53dfaa306b1d0', '0xa1e3f062ce5825c1e19207cd93cefdad82a8a631'],
    [parseEther('0.1').toString(), parseEther('0.1').toString()],
    '0',
  )
};
