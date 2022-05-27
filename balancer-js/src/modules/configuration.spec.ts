import { expect } from 'chai';
import { Configuration } from './configuration';
import { balancerVault } from '../lib/constants/config';
import { Network } from '../lib/constants/network';

describe('Configuration', () => {
    const network = Network.KOVAN;
    const configuration = new Configuration(network, '');

    it('allows to set a network value', () => {
        expect(configuration.networkConfig.chainId).to.eq(network);
    });

    it('gets network properties', () => {
        const { vault } = configuration.contracts;

        expect(vault).to.eq(balancerVault);
    });
});
