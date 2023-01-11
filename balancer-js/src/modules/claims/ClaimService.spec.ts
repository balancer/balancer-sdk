import {BalancerError, BalancerErrorCode} from "@/balancerErrors";
import {Network} from "@/lib/constants";
import {ClaimService} from "@/modules/claims/ClaimService";
import {BalancerSDK} from "@/modules/sdk.module";
import {expect} from "chai";

let sdk: BalancerSDK;

describe("ClaimService On Ethereum", () => {

  before(() => {
    const sdkConfig = {
      network: Network.MAINNET,
      rpcUrl: 'https://rpc.ankr.com/eth',
    };
    sdk = new BalancerSDK(sdkConfig);
  })

  context("getClaimableTokens", () => {
    it("should return gauges with claimable tokens", (done) => {
      if (!sdk.data.liquidityGauges) throw new Error("liquidityGauges not initialized");
      const service = new ClaimService(sdk.data.liquidityGauges, sdk.networkConfig.chainId, sdk.networkConfig.addresses.contracts.multicall, sdk.provider, sdk.networkConfig.addresses.contracts.gaugeClaimHelper);
      service.getClaimableTokens('0x558FA75074cc7cF045C764aEd47D37776Ea697d2')
        .then((gauges) => {
          expect(gauges).not.to.be.undefined
          expect(gauges?.length).to.eq(0);
          done();
        })
        .catch((error) => {
          done(error);
        })
    });
  });
});

describe("ClaimService On Polygon", () => {

  before(() => {
    const sdkConfig = {
      network: Network.POLYGON,
      rpcUrl: 'https://rpc.ankr.com/polygon',
    };
    sdk = new BalancerSDK(sdkConfig);
  })

  context("getClaimableTokens", () => {
    it("should return gauges with claimable tokens", (done) => {
      if (!sdk.data.liquidityGauges) throw new Error("liquidityGauges not initialized");
      const service = new ClaimService(sdk.data.liquidityGauges, sdk.networkConfig.chainId, sdk.networkConfig.addresses.contracts.multicall, sdk.provider, sdk.networkConfig.addresses.contracts.gaugeClaimHelper);
      service.getClaimableTokens('0x558FA75074cc7cF045C764aEd47D37776Ea697d2')
        .then((gauges) => {
          expect(gauges).not.to.be.undefined
          expect(gauges?.length).to.eq(1);
          const gauge = gauges[0];
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
});