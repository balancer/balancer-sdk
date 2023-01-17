import {Network} from "@/lib/constants";
import {FeeDistributor} from "@/modules/contracts/implementations/feeDistributor";
import {BalancerSDK} from "@/modules/sdk.module";

const config = {
  network: Network.MAINNET,
  rpcUrl: 'http://127.0.0.1:8545'
}
const sdk = new BalancerSDK(config);

if (!sdk.networkConfig.addresses.contracts.feeDistributor) throw new Error('feeDistributor contract address not defined');
const feeDistributor = FeeDistributor(sdk.networkConfig.addresses.contracts.feeDistributor, sdk.provider);

async function run() {
  const claimableTokens: string[] = [
    '0x7B50775383d3D6f0215A8F290f2C9e2eEBBEceb2', // bb-a-USD v1
    '0xA13a9247ea42D743238089903570127DdA72fE44', // bb-a-USD v2
    '0xba100000625a3754423978a60c9317c58a424e3D', // BAL
  ];

  const userAddress = '0x549c660ce2B988F588769d6AD87BE801695b2be3';
  const tokensAmounts = await feeDistributor.callStatic.claimTokens(userAddress, claimableTokens);
  claimableTokens.forEach((it, index) => console.log(`${it} = ${tokensAmounts[index].toNumber()}`))

  console.log();
  const tokenAmount = await feeDistributor.callStatic.claimToken(userAddress, claimableTokens[1]);
  console.log(`${claimableTokens[1]} = ${tokenAmount.toNumber()}`);

}

run().then(() => console.log('done'));