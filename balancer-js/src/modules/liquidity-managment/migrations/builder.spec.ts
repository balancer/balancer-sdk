import { expect } from 'chai';
import { migrationBuilder } from './builder';
import { buildMigrationPool } from './helpers';
import {
  metaStable,
  bDaiPool,
  composableStable,
  poolsRepository,
} from './builder.spec-helpers';

describe('Migrations', () => {
  context('Metastable to Metastable', () => {
    const from = metaStable;
    const to = from;
    const address = '0xfacec29Ae158B26e234B1a81Db2431F6Bd8F8cE8';

    it('should build a migration using exit / join only', async () => {
      const migration = migrationBuilder(
        address,
        address,
        '1000000000000000000',
        '0',
        from,
        to
      );
      expect(migration).to.match(/^0xac9650d8*/);
    });
  });

  describe('.buildMigrationPool', () => {
    it('should build a migrationPool with nested tokens', async () => {
      const migrationPool = await buildMigrationPool(
        composableStable.id,
        poolsRepository
      );
      const tokens = migrationPool.tokens.map(({ address }) => address).flat();
      expect(tokens.length).to.eq(4);
      expect(tokens).to.include(bDaiPool.address);
      const nestedTokens = migrationPool.tokens[3].tokens;
      expect(nestedTokens).to.not.be.undefined;
      if (nestedTokens) {
        expect(nestedTokens.flatMap(({ address }) => address).length).to.eq(3);
        expect(nestedTokens.flatMap(({ address }) => address)).to.include(
          bDaiPool.address
        );
      }
    });
  });
});
