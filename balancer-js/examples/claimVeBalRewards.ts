import {Network} from "@/lib/constants";
import {BalancerSDK} from "@/modules/sdk.module";
import {forkSetup} from "@/test/lib/utils";
import hardhat from "hardhat";

const userAddress = '0x549c660ce2B988F588769d6AD87BE801695b2be3';
const claimableTokens: string[] = [
  '0x7B50775383d3D6f0215A8F290f2C9e2eEBBEceb2', // bb-a-USD v1
  '0xA13a9247ea42D743238089903570127DdA72fE44', // bb-a-USD v2
  '0xba100000625a3754423978a60c9317c58a424e3D', // BAL
];

const rpcUrl = 'http://127.0.0.1:8545';
const blockNumber = 16361617;
const { ethers } = hardhat;
const provider = new ethers.providers.JsonRpcProvider(rpcUrl, 1);
const signer = provider.getSigner();
const jsonRpcUrl = 'https://rpc.ankr.com/eth';
const sdk = new BalancerSDK(
  {
    network: Network.MAINNET,
    rpcUrl: rpcUrl
  });
const { claimService } = sdk;

(async function () {

  await forkSetup(signer, [], [], [], jsonRpcUrl as string, blockNumber);


  if (!claimService) throw new Error("ClaimService not defined");
  const balance = await claimService.getClaimableVeBalTokens(userAddress, claimableTokens);
  console.table(balance);
  const data = await claimService.buildClaimVeBalTokensRequest(userAddress, claimableTokens);
  console.log(`
    to:                  ${data.to} - BalancerMinter Address ${sdk.networkConfig.addresses.contracts.feeDistributor}
    from:                ${data.from} - User Address ${userAddress}
    tokensOut:           ${data.tokensOut}
    expectedTokensValue: ${data.expectedTokensValue}
    functionName:        ${data.functionName}
    callData:            ${data.callData.slice(0, 10)}...${data.callData.slice(-5)}
  `)

  console.log(`\n\nfinally:
  
  const tx = { to: data.to', data: callData };
  const receipt = await (await signer.sendTransaction(tx)).wait();
  `)


})();