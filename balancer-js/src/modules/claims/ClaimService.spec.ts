import {Network} from "@/lib/constants";
import {ClaimService} from "@/modules/claims/ClaimService";
import {BalancerSDK} from "@/modules/sdk.module";
import {expect} from "chai";

let sdk: BalancerSDK;
let service: ClaimService;

describe("ClaimService On Ethereum", () => {

  before(() => {
    const sdkConfig = {
      network: Network.MAINNET,
      rpcUrl: 'https://rpc.ankr.com/eth',
    };
    sdk = new BalancerSDK(sdkConfig);
    if (!sdk.data.liquidityGauges) throw new Error("liquidityGauges not initialized");
    service = new ClaimService(
      sdk.data.liquidityGauges,
      sdk.networkConfig.chainId,
      sdk.networkConfig.addresses.contracts.multicall,
      sdk.provider,
      sdk.networkConfig.addresses.contracts.gaugeClaimHelper,
      sdk.networkConfig.addresses.contracts.balancerMinterAddress);
  })

  context("initialization", () => {
    it("should get service from SDK", (done) => {
      const service = sdk.claimService;
      expect(service).to.be
      done();
    });
  })

  context("getClaimableTokens", () => {
    it("should return gauges with claimable tokens", (done) => {
      service.getClaimableTokens('0x549c660ce2B988F588769d6AD87BE801695b2be3')
        .then((gauges) => {
          expect(gauges).not.to.be.undefined
          expect(gauges?.length).to.eq(2);

          let gauge = gauges.find((it) => it.address === '0xcd4722b7c24c29e0413bdcd9e51404b4539d14ae');
          expect(Object.keys(gauge?.claimableTokens ?? {}).length).to.eq(1);
          expect(gauge?.claimableTokens!['0xba100000625a3754423978a60c9317c58a424e3d']).to.be.gt(0);

          gauge = gauges.find((it) => it.address === '0x275df57d2b23d53e20322b4bb71bf1dcb21d0a00');
          expect(Object.keys(gauge?.claimableTokens ?? {}).length).to.eq(1);
          expect(gauge?.claimableTokens!['0xba100000625a3754423978a60c9317c58a424e3d']).to.be.gt(0);

          done();
        })
        .catch((error) => {
          done(error);
        })
    });
  });

  context("claimRewardTokens", () => {
    it("should returns call data for one gauge", (done) => {
      service.claimRewardTokens(
        ["0xcd4722b7c24c29e0413bdcd9e51404b4539d14ae"],
        '0x549c660ce2B988F588769d6AD87BE801695b2be3')
        .then((data) => {
          expect(data.callData).to.eq('0x397ada2100000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000001000000000000000000000000cd4722b7c24c29e0413bdcd9e51404b4539d14ae');
          expect(data.tokensOut.length).to.eq(1);
          expect(data.tokensOut.find((it) => it.toLowerCase() === '0xba100000625a3754423978a60c9317c58a424e3d')).to.be;
          expect(data.expectedTokensValue.every((it) => it > 0)).to.be.true;
        })
        .then(done)
        .catch((error) => done(error));
    });
    it("should returns call data for multiple gauge", (done) => {
      service.claimRewardTokens(
        ["0xcd4722b7c24c29e0413bdcd9e51404b4539d14ae", "0x275df57d2b23d53e20322b4bb71bf1dcb21d0a00"],
        '0x549c660ce2B988F588769d6AD87BE801695b2be3')
        .then((data) => {
          expect(data.callData).to.eq('0x397ada2100000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000002000000000000000000000000cd4722b7c24c29e0413bdcd9e51404b4539d14ae000000000000000000000000275df57d2b23d53e20322b4bb71bf1dcb21d0a00');
          expect(data.tokensOut.length).to.eq(1);
          expect(data.tokensOut.find((it) => it.toLowerCase() === '0xba100000625a3754423978a60c9317c58a424e3d')).to.be;
          expect(data.expectedTokensValue.every((it) => it > 0)).to.be.true;
        })
        .then(done)
        .catch((error) => done(error));
    });
  })

});

describe("ClaimService On Polygon", () => {
  before(() => {
    const sdkConfig = {
      network: Network.POLYGON,
      rpcUrl: 'https://rpc.ankr.com/polygon',
    };
    sdk = new BalancerSDK(sdkConfig);
    if (!sdk.data.liquidityGauges) throw new Error("liquidityGauges not initialized");
    service = new ClaimService(
      sdk.data.liquidityGauges,
      sdk.networkConfig.chainId,
      sdk.networkConfig.addresses.contracts.multicall,
      sdk.provider,
      sdk.networkConfig.addresses.contracts.gaugeClaimHelper,
      sdk.networkConfig.addresses.contracts.balancerMinterAddress);
  });

  context("initialization", () => {
    it("should get service from SDK", (done) => {
      const service = sdk.claimService;
      expect(service).to.be
      done();
    });
  });

  context("getClaimableTokens", () => {
    it("should return gauges with claimable tokens", (done) => {
      if (!sdk.data.liquidityGauges) throw new Error("liquidityGauges not initialized");
      const service = new ClaimService(sdk.data.liquidityGauges, sdk.networkConfig.chainId, sdk.networkConfig.addresses.contracts.multicall, sdk.provider, sdk.networkConfig.addresses.contracts.gaugeClaimHelper);
      service.getClaimableTokens('0x2fec742b5b697b39362eeFC28B7E9E4DF25B8480')
        .then((gauges) => {
          expect(gauges).not.to.be.undefined
          expect(gauges?.length).to.eq(2);

          let gauge = gauges.find((it) => it.address === '0x068ff98072d3eb848d012e3390703bb507729ed6');
          expect(Object.keys(gauge?.claimableTokens ?? {}).length).to.eq(1);
          expect(gauge?.claimableTokens!['0x9a71012b13ca4d3d0cdc72a177df3ef03b0e76a3']).to.be.gt(0);

          gauge = gauges.find((it) => it.address === '0x2aa6fb79efe19a3fce71c46ae48efc16372ed6dd');
          expect(Object.keys(gauge?.claimableTokens ?? {}).length).to.eq(2);
          expect(gauge?.claimableTokens!['0x9a71012b13ca4d3d0cdc72a177df3ef03b0e76a3']).to.be.gt(0);
          expect(gauge?.claimableTokens!['0xc3c7d422809852031b44ab29eec9f1eff2a58756']).to.be.gt(0);

          done();
        })
        .catch((error) => {
          done(error);
        })
    });
  });

  context("claimRewardTokens", () => {
    it("should returns call data for one gauge", (done) => {
      service.claimRewardTokens(['0x068ff98072d3eb848d012e3390703bb507729ed6'], '0x2fec742b5b697b39362eeFC28B7E9E4DF25B8480')
        .then((data) => {
          expect(data.callData).to.eq('0xc2ec33b500000000000000000000000000000000000000000000000000000000000000400000000000000000000000002fec742b5b697b39362eefc28b7e9e4df25b84800000000000000000000000000000000000000000000000000000000000000001000000000000000000000000068ff98072d3eb848d012e3390703bb507729ed6');
          expect(data.tokensOut.length).to.eq(1);
          expect(data.tokensOut[0]).to.eq('0x9a71012b13ca4d3d0cdc72a177df3ef03b0e76a3');
        })
        .then(done)
        .catch((error) => done(error));
    });
    it("should returns call data for multiple gauge", (done) => {
      service.claimRewardTokens(['0x068ff98072d3eb848d012e3390703bb507729ed6', '0x2aa6fb79efe19a3fce71c46ae48efc16372ed6dd'], '0x2fec742b5b697b39362eeFC28B7E9E4DF25B8480')
        .then((data) => {
          expect(data.callData).to.eq('0xc2ec33b500000000000000000000000000000000000000000000000000000000000000400000000000000000000000002fec742b5b697b39362eefc28b7e9e4df25b84800000000000000000000000000000000000000000000000000000000000000002000000000000000000000000068ff98072d3eb848d012e3390703bb507729ed60000000000000000000000002aa6fb79efe19a3fce71c46ae48efc16372ed6dd');
          expect(data.tokensOut.length).to.eq(2);
          expect(data.tokensOut.find((it) => it.toLowerCase() === '0x9a71012b13ca4d3d0cdc72a177df3ef03b0e76a3')).to.be;
          expect(data.tokensOut.find((it) => it.toLowerCase() === '0xc3c7d422809852031b44ab29eec9f1eff2a58756')).to.be;
          expect(data.expectedTokensValue.every((it) => it > 0)).to.be.true;
        })
        .then(done)
        .catch((error) => done(error));
    });
  })
});