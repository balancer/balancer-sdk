import dotenv from 'dotenv';
import { expect } from 'chai';
import {
    BalancerSdkConfig,
    BalancerSdkSorConfig,
    Network,
    BalancerSDK,
} from '@/.';
import { Contracts } from './contracts.module';

let sdkConfig: BalancerSdkConfig;

dotenv.config();

describe('contracts module', () => {
    before(() => {
        sdkConfig = {
            network: Network.MAINNET,
            rpcUrl: ``,
        };
    });

    context('instantiation', () => {
        it('instantiate via module', async () => {
            const contracts = new Contracts(sdkConfig);
            // expect(pools).to.deep.eq(pools_14717479);
        });

        it('instantiate via SDK', async () => {
            const balancer = new BalancerSDK(sdkConfig);
        });
    });
});
