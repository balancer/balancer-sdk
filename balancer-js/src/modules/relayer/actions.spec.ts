import { expect } from 'chai';
import { Relayer } from './relayer.module';
import * as action from './actions';

/**
 * Write spec for the relayer steps module.
 */

describe('Relayer actions', () => {
  const address = '0xfacec29Ae158B26e234B1a81Db2431F6Bd8F8cE8';
  const poolId =
    '0x32296969ef14eb0c6d29669c550d4a0449130230000200000000000000000080';

  describe('.setRelayerApproval', () => {
    it('should encode', () => {
      const subject = action.setRelayerApproval(address, true, '0xdeadbeef');
      expect(subject).to.contain('deadbeef');
    });
  });

  describe('.gaugeWithdrawal', () => {
    it('should encode', () => {
      const subject = action.gaugeWithdrawal(
        address,
        address,
        address,
        '1000000000000000000'
      );
      expect(subject).to.match(/^0x65ca4804*/);
    });
  });

  describe('.gaugeDeposit', () => {
    it('should encode', () => {
      const subject = action.gaugeDeposit(
        address,
        address,
        address,
        '1000000000000000000'
      );
      expect(subject).to.match(/^0x7bc008f5*/);
    });
  });

  describe('.exit', () => {
    it('should encode', () => {
      const assets = [address, address, address];
      const refs = assets.map((_, idx) => ({
        index: idx,
        key: Relayer.toChainedReference(`10${idx}`),
      }));
      const subject = action.exit(
        poolId,
        'Weighted',
        1,
        assets,
        -1,
        refs,
        '1000000000000000000',
        address,
        address
      );
      expect(subject).to.match(/^0xd80952d5*/);
    });
  });

  describe('.join', () => {
    it('should encode', () => {
      const assets = [address, address, address];
      const refs = assets.map((_, idx) =>
        String(Relayer.toChainedReference(`10${idx}`))
      );
      const output = Relayer.toChainedReference(`999`);
      const subject = action.join(
        poolId,
        'Weighted',
        1,
        assets,
        refs,
        '0',
        String(output),
        address,
        address
      );
      expect(subject).to.match(/^0x8fe4624f*/);
    });
  });

  describe('.swaps', () => {
    it('should encode', () => {
      const swaps = [
        {
          path: [
            {
              poolId,
              assetIn: address,
              assetOut: address,
            },
          ],
          inputAmount: '1000000000000000000',
          outputReference: Relayer.toChainedReference(`20${0}`),
        },
      ];
      const subject = action.swaps(address, address, swaps);
      expect(subject).to.match(/^0x18369446*/);
    });
  });
});
