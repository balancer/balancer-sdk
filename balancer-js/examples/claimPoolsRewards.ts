import { Network } from '@/lib/constants';
import { BalancerSDK } from '@/modules/sdk.module';
import { forkSetup } from '@/test/lib/utils';
import hardhat from 'hardhat';

const userAddress = '0x549c660ce2B988F588769d6AD87BE801695b2be3';

const rpcUrl = 'http://127.0.0.1:8545';
const blockNumber = 16361617;
const { ethers } = hardhat;
const provider = new ethers.providers.JsonRpcProvider(rpcUrl, 1);
const signer = provider.getSigner();
const jsonRpcUrl = 'https://rpc.ankr.com/eth';
const sdk = new BalancerSDK({
  network: Network.MAINNET,
  rpcUrl: rpcUrl,
});
const { claimService } = sdk;

(async function () {
  await forkSetup(signer, [], [], [], jsonRpcUrl as string, blockNumber);

  if (!claimService) throw new Error('ClaimService not defined');
  const balanceGauges = await claimService.getClaimableRewardTokens(
    userAddress
  );
  console.table(balanceGauges.map((it) => it.claimableTokens));
  const gauges = balanceGauges.map((it) => it.address);
  let data = await claimService.buildClaimRewardTokensRequest(
    gauges.slice(0, 1),
    userAddress
  );
  console.log(`\nSingle Gauge Claim ( gauge: ${gauges.slice(0, 1)})
    to:                  ${data.to} - BalancerMinter Address ${
    sdk.networkConfig.addresses.contracts.balancerMinter
  }
    from:                ${data.from} - User Address ${userAddress}
    tokensOut:           ${data.tokensOut}
    expectedTokensValue: ${data.expectedTokensValue}
    functionName:        ${data.functionName}
    callData:            ${data.callData.slice(0, 10)}...${data.callData.slice(
    -5
  )}
  `);
  data = await claimService.buildClaimRewardTokensRequest(gauges, userAddress);
  console.log(`\nMultiple Gauges Claim
    to:                  ${data.to} - BalancerMinter Address ${
    sdk.networkConfig.addresses.contracts.balancerMinter
  }
    from:                ${data.from} - User Address ${userAddress}
    tokensOut:           ${data.tokensOut}
    expectedTokensValue: ${data.expectedTokensValue}
    functionName:        ${data.functionName}
    callData:            ${data.callData.slice(0, 10)}...${data.callData.slice(
    -5
  )}
  `);

  console.log(`\n\nfinally:
  
  const tx = { to: data.to', data: callData };
  const receipt = await (await signer.sendTransaction(tx)).wait();
  `);
})();
