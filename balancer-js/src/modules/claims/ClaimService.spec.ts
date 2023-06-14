// import { Network } from '@/lib/constants';
// import { ClaimService } from '@/modules/claims/ClaimService';
// import { ZERO } from './helper';
// import { BalancerSDK } from '@/modules/sdk.module';
// import { forkSetup } from '@/test/lib/utils';
// import { expect } from 'chai';
// import dotenv from 'dotenv';
// import hardhat from 'hardhat';
//
// dotenv.config();
//
// let sdk: BalancerSDK;
// let service: ClaimService;
//
// describe('ClaimService On Ethereum', () => {
//   const { ALCHEMY_URL: jsonRpcUrl } = process.env;
//   const rpcUrl = 'http://127.0.0.1:8545';
//
//   const blockNumber = 16361617;
//   const { ethers } = hardhat;
//   const provider = new ethers.providers.JsonRpcProvider(rpcUrl, 1);
//   const signer = provider.getSigner();
//
//   context('', () => {
//     before(async function () {
//       this.timeout(40000);
//       const sdkConfig = {
//         network: Network.MAINNET,
//         rpcUrl: rpcUrl,
//       };
//       sdk = new BalancerSDK(sdkConfig);
//       if (!sdk.data.liquidityGauges)
//         throw new Error('liquidityGauges not initialized');
//       await forkSetup(signer, [], [], [], jsonRpcUrl as string, blockNumber);
//
//       service = new ClaimService(
//         sdk.data.liquidityGauges,
//         sdk.data.feeDistributor,
//         sdk.networkConfig.chainId,
//         sdk.networkConfig.addresses.contracts.multicall,
//         sdk.provider,
//         sdk.networkConfig.addresses.contracts.gaugeClaimHelper,
//         sdk.networkConfig.addresses.contracts.balancerMinter
//       );
//     });
//
//     context('initialization', () => {
//       it('should get service from SDK', (done) => {
//         const service = sdk.claimService;
//         expect(service).to.be;
//         done();
//       });
//     });
//
//     context('getClaimableTokens', () => {
//       it('should return gauges with claimable tokens', (done) => {
//         service
//           .getClaimableRewardTokens(
//             '0x549c660ce2B988F588769d6AD87BE801695b2be3'
//           )
//           .then((gauges) => {
//             expect(gauges).not.to.be.undefined;
//             expect(gauges?.length).to.eq(2);
//
//             let gauge = gauges.find(
//               (it) =>
//                 it.address === '0xcd4722b7c24c29e0413bdcd9e51404b4539d14ae'
//             );
//             expect(Object.keys(gauge?.claimableTokens ?? {}).length).to.eq(1);
//             expect(
//               gauge?.claimableTokens &&
//                 gauge?.claimableTokens[
//                   '0xba100000625a3754423978a60c9317c58a424e3d'
//                 ].gt(ZERO)
//             ).to.be.true;
//
//             gauge = gauges.find(
//               (it) =>
//                 it.address === '0x275df57d2b23d53e20322b4bb71bf1dcb21d0a00'
//             );
//             expect(Object.keys(gauge?.claimableTokens ?? {}).length).to.eq(1);
//             expect(
//               gauge?.claimableTokens &&
//                 gauge?.claimableTokens[
//                   '0xba100000625a3754423978a60c9317c58a424e3d'
//                 ].gt(ZERO)
//             ).to.be.true;
//
//             done();
//           })
//           .catch((error) => {
//             done(error);
//           });
//       }).timeout(600000);
//     });
//
//     context('claimRewardTokens', () => {
//       it('should returns call data for one gauge', (done) => {
//         service
//           .buildClaimRewardTokensRequest(
//             ['0xcd4722b7c24c29e0413bdcd9e51404b4539d14ae'],
//             '0x549c660ce2B988F588769d6AD87BE801695b2be3'
//           )
//           .then((data) => {
//             expect(data.callData).to.eq(
//               '0x397ada2100000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000001000000000000000000000000cd4722b7c24c29e0413bdcd9e51404b4539d14ae'
//             );
//             expect(data.tokensOut.length).to.eq(1);
//             expect(
//               data.tokensOut.find(
//                 (it) =>
//                   it.toLowerCase() ===
//                   '0xba100000625a3754423978a60c9317c58a424e3d'
//               )
//             ).to.be;
//             expect(data.expectedTokensValue.every((it) => it.gt(ZERO))).to.be
//               .true;
//           })
//           .then(done)
//           .catch((error) => done(error));
//       }).timeout(60000);
//       it('should returns call data for multiple gauge', (done) => {
//         service
//           .buildClaimRewardTokensRequest(
//             [
//               '0xcd4722b7c24c29e0413bdcd9e51404b4539d14ae',
//               '0x275df57d2b23d53e20322b4bb71bf1dcb21d0a00',
//             ],
//             '0x549c660ce2B988F588769d6AD87BE801695b2be3'
//           )
//           .then((data) => {
//             expect(data.callData).to.eq(
//               '0x397ada2100000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000002000000000000000000000000cd4722b7c24c29e0413bdcd9e51404b4539d14ae000000000000000000000000275df57d2b23d53e20322b4bb71bf1dcb21d0a00'
//             );
//             expect(data.tokensOut.length).to.eq(1);
//             expect(
//               data.tokensOut.find(
//                 (it) =>
//                   it.toLowerCase() ===
//                   '0xba100000625a3754423978a60c9317c58a424e3d'
//               )
//             ).to.be;
//             expect(data.expectedTokensValue.every((it) => it.gt(ZERO))).to.be
//               .true;
//           })
//           .then(done)
//           .catch((error) => done(error));
//       }).timeout(60000);
//     });
//
//     context('getClaimableVeBalTokens', () => {
//       const claimableTokens: string[] = [
//         '0x7B50775383d3D6f0215A8F290f2C9e2eEBBEceb2', // bb-a-USD v1
//         '0xA13a9247ea42D743238089903570127DdA72fE44', // bb-a-USD v2
//         '0xba100000625a3754423978a60c9317c58a424e3D', // BAL
//       ];
//       it('should return claimable tokens', (done) => {
//         service
//           .getClaimableVeBalTokens(
//             '0x549c660ce2B988F588769d6AD87BE801695b2be3',
//             claimableTokens
//           )
//           .then((tokens) => {
//             expect(tokens[claimableTokens[0]].eq(ZERO)).to.be.true;
//             expect(tokens[claimableTokens[1]].gt(ZERO)).to.be.true;
//             expect(tokens[claimableTokens[2]].gt(ZERO)).to.be.true;
//           })
//           .then(done)
//           .catch((error) => done(error));
//       });
//     });
//
//     context('claimableVeBalTokens', () => {
//       const claimableTokens: string[] = [
//         '0x7B50775383d3D6f0215A8F290f2C9e2eEBBEceb2', // bb-a-USD v1
//         '0xA13a9247ea42D743238089903570127DdA72fE44', // bb-a-USD v2
//         '0xba100000625a3754423978a60c9317c58a424e3D', // BAL
//       ];
//       it('should return transaction data for 3 tokens', (done) => {
//         service
//           .buildClaimVeBalTokensRequest(
//             '0x549c660ce2B988F588769d6AD87BE801695b2be3',
//             claimableTokens
//           )
//           .then((transactionData) => {
//             expect(transactionData.callData).to.eq(
//               '0x88720467000000000000000000000000549c660ce2b988f588769d6ad87be801695b2be3000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000030000000000000000000000007b50775383d3d6f0215a8f290f2c9e2eebbeceb2000000000000000000000000a13a9247ea42d743238089903570127dda72fe44000000000000000000000000ba100000625a3754423978a60c9317c58a424e3d'
//             );
//           })
//           .then(done)
//           .catch((error) => done(error));
//       });
//       it('should return transaction data for 2 tokens', (done) => {
//         service
//           .buildClaimVeBalTokensRequest(
//             '0x549c660ce2B988F588769d6AD87BE801695b2be3',
//             claimableTokens.slice(1)
//           )
//           .then((transactionData) => {
//             expect(transactionData.callData).to.eq(
//               '0x88720467000000000000000000000000549c660ce2b988f588769d6ad87be801695b2be300000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000002000000000000000000000000a13a9247ea42d743238089903570127dda72fe44000000000000000000000000ba100000625a3754423978a60c9317c58a424e3d'
//             );
//           })
//           .then(done)
//           .catch((error) => done(error));
//       });
//     });
//   });
// }).timeout(40000);
//
// describe('ClaimService On Polygon', () => {
//   before(() => {
//     const sdkConfig = {
//       network: Network.POLYGON,
//       rpcUrl: 'https://rpc.ankr.com/polygon',
//     };
//     sdk = new BalancerSDK(sdkConfig);
//     if (!sdk.data.liquidityGauges)
//       throw new Error('liquidityGauges not initialized');
//     service = new ClaimService(
//       sdk.data.liquidityGauges,
//       sdk.data.feeDistributor,
//       sdk.networkConfig.chainId,
//       sdk.networkConfig.addresses.contracts.multicall,
//       sdk.provider,
//       sdk.networkConfig.addresses.contracts.gaugeClaimHelper,
//       sdk.networkConfig.addresses.contracts.balancerMinter
//     );
//   });
//
//   context('initialization', () => {
//     it('should get service from SDK', (done) => {
//       const service = sdk.claimService;
//       expect(service).to.be;
//       done();
//     });
//   });
//
//   context('getClaimableTokens', () => {
//     it('should return gauges with claimable tokens', (done) => {
//       if (!sdk.data.liquidityGauges)
//         throw new Error('liquidityGauges not initialized');
//       const service = new ClaimService(
//         sdk.data.liquidityGauges,
//         sdk.data.feeDistributor,
//         sdk.networkConfig.chainId,
//         sdk.networkConfig.addresses.contracts.multicall,
//         sdk.provider,
//         sdk.networkConfig.addresses.contracts.gaugeClaimHelper
//       );
//       service
//         .getClaimableRewardTokens('0x2fec742b5b697b39362eeFC28B7E9E4DF25B8480')
//         .then((gauges) => {
//           expect(gauges).not.to.be.undefined;
//           expect(gauges?.length).to.eq(2);
//
//           let gauge = gauges.find(
//             (it) => it.address === '0x068ff98072d3eb848d012e3390703bb507729ed6'
//           );
//           expect(Object.keys(gauge?.claimableTokens ?? {}).length).to.eq(1);
//           expect(
//             gauge?.claimableTokens &&
//               gauge?.claimableTokens[
//                 '0x9a71012b13ca4d3d0cdc72a177df3ef03b0e76a3'
//               ].gt(ZERO)
//           ).to.be.true;
//
//           gauge = gauges.find(
//             (it) => it.address === '0x2aa6fb79efe19a3fce71c46ae48efc16372ed6dd'
//           );
//           expect(Object.keys(gauge?.claimableTokens ?? {}).length).to.eq(2);
//           expect(
//             gauge?.claimableTokens &&
//               gauge?.claimableTokens[
//                 '0x9a71012b13ca4d3d0cdc72a177df3ef03b0e76a3'
//               ].gt(ZERO)
//           ).to.be.true;
//           expect(
//             gauge?.claimableTokens &&
//               gauge?.claimableTokens[
//                 '0xc3c7d422809852031b44ab29eec9f1eff2a58756'
//               ].gt(ZERO)
//           ).to.be.true;
//
//           done();
//         })
//         .catch((error) => {
//           done(error);
//         });
//     }).timeout(60000);
//   });
//
//   context('claimRewardTokens', () => {
//     it('should returns call data for one gauge', (done) => {
//       service
//         .buildClaimRewardTokensRequest(
//           ['0x068ff98072d3eb848d012e3390703bb507729ed6'],
//           '0x2fec742b5b697b39362eeFC28B7E9E4DF25B8480'
//         )
//         .then((data) => {
//           expect(data.callData).to.eq(
//             '0xc2ec33b500000000000000000000000000000000000000000000000000000000000000400000000000000000000000002fec742b5b697b39362eefc28b7e9e4df25b84800000000000000000000000000000000000000000000000000000000000000001000000000000000000000000068ff98072d3eb848d012e3390703bb507729ed6'
//           );
//           expect(data.tokensOut.length).to.eq(1);
//           expect(data.tokensOut[0]).to.eq(
//             '0x9a71012b13ca4d3d0cdc72a177df3ef03b0e76a3'
//           );
//         })
//         .then(done)
//         .catch((error) => done(error));
//     }).timeout(60000);
//     it('should returns call data for multiple gauge', (done) => {
//       service
//         .buildClaimRewardTokensRequest(
//           [
//             '0x068ff98072d3eb848d012e3390703bb507729ed6',
//             '0x2aa6fb79efe19a3fce71c46ae48efc16372ed6dd',
//           ],
//           '0x2fec742b5b697b39362eeFC28B7E9E4DF25B8480'
//         )
//         .then((data) => {
//           expect(data.callData).to.eq(
//             '0xc2ec33b500000000000000000000000000000000000000000000000000000000000000400000000000000000000000002fec742b5b697b39362eefc28b7e9e4df25b84800000000000000000000000000000000000000000000000000000000000000002000000000000000000000000068ff98072d3eb848d012e3390703bb507729ed60000000000000000000000002aa6fb79efe19a3fce71c46ae48efc16372ed6dd'
//           );
//           expect(data.tokensOut.length).to.eq(2);
//           expect(
//             data.tokensOut.find(
//               (it) =>
//                 it.toLowerCase() ===
//                 '0x9a71012b13ca4d3d0cdc72a177df3ef03b0e76a3'
//             )
//           ).to.be;
//           expect(
//             data.tokensOut.find(
//               (it) =>
//                 it.toLowerCase() ===
//                 '0xc3c7d422809852031b44ab29eec9f1eff2a58756'
//             )
//           ).to.be;
//           expect(data.expectedTokensValue.every((it) => it.gt(ZERO))).to.be
//             .true;
//         })
//         .then(done)
//         .catch((error) => done(error));
//     }).timeout(60000);
//   });
// });
