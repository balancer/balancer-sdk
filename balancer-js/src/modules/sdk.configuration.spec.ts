import { expect } from 'chai';
import { configuration } from './sdk.configuration';
import { balancerVault } from '../lib/constants/config';
import { Network } from '../lib/constants/network';

describe('Configuration', () => {
    it('allows to set a network value', () => {
        const network = Network.KOVAN;
        configuration.network = network;
        expect(configuration.chainId).to.eq(network);
    });

    it('gets network properties', () => {
        const { vault } = configuration.addresses.contracts;
        expect(vault).to.eq(balancerVault);
    });
});
