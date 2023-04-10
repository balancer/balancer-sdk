import { impersonateAccount, reset } from '@/test/lib/utils';
import { expect } from 'chai';
import { Vault__factory } from '@/contracts';
import { BALANCER_NETWORK_CONFIG } from '@/lib/constants/config';
import { JsonRpcProvider, JsonRpcSigner } from '@ethersproject/providers';
import { ERC20 } from '@/modules/contracts/implementations/ERC20';
import {
  vitaDao1,
  vitaDao2,
  metaStable,
  composableStable,
  poolRepository,
  gaugesRepository,
  polygonComposableStable,
  polygonPoolRepository,
} from './migrations/builder.spec-helpers';
import { Migrations } from './migrations';

describe('Migrations', () => {
  context('mainnet', () => {
    const {
      addresses: { contracts },
    } = BALANCER_NETWORK_CONFIG[1];
    const relayerAddress = contracts.relayerV5 as string;
    const provider = new JsonRpcProvider('http://127.0.0.1:8545');
    const vault = Vault__factory.connect(contracts.vault, provider);
    let signer: JsonRpcSigner;
    let address: string;

    const migrations = new Migrations(
      relayerAddress,
      poolRepository,
      gaugesRepository,
      provider
    );

    beforeEach(async () => {
      await reset('https://rpc.ankr.com/eth', provider, 16950000);
      signer = await impersonateAccount(address, provider);

      // approve relayer
      await vault
        .connect(signer)
        .setRelayerApproval(address, relayerAddress, true);
    });

    context('Metastable to Metastable', () => {
      const from = metaStable;
      const to = from;

      describe('bptHodler', () => {
        before(() => {
          address = '0x21ac89788d52070D23B8EaCEcBD3Dc544178DC60';
        });

        it('joins a new pool with an limit', async () => {
          const balance = await ERC20(from.address, signer).balanceOf(address);
          const peek = await migrations.pool2pool(
            address,
            from.id,
            to.id,
            balance
          );
          const peekResult = await signer.call({ ...peek, gasLimit: 8e6 });
          const expectedBptOut = Migrations.getMinBptOut(peekResult);

          const txParams = await migrations.pool2pool(
            address,
            from.id,
            to.id,
            balance,
            expectedBptOut
          );

          await (await signer.sendTransaction(txParams)).wait();

          const balanceAfter = await ERC20(to.address, signer).balanceOf(
            address
          );

          expect(String(balanceAfter)).to.be.eq(expectedBptOut);
        });
      });

      describe('staked bpt', () => {
        before(() => {
          address = '0xe8343fd029561289CF7359175EE84DA121817C71';
        });

        it('should build a migration using exit / join and stake tokens in the gauge', async () => {
          const gauge = (await gaugesRepository.findBy('poolId', from.id)) as {
            id: string;
          };
          const balance = await ERC20(gauge.id, signer).balanceOf(address);

          const peek = await migrations.pool2poolWithGauges(
            address,
            from.id,
            to.id,
            balance
          );
          const peekResult = await signer.call({ ...peek, gasLimit: 8e6 });
          const expectedBptOut = Migrations.getMinBptOut(peekResult);

          const txParams = await migrations.pool2poolWithGauges(
            address,
            from.id,
            to.id,
            balance,
            expectedBptOut
          );

          await (await signer.sendTransaction(txParams)).wait();

          const balanceAfter = await ERC20(gauge.id, signer).balanceOf(address);

          expect(String(balanceAfter)).to.be.eq(expectedBptOut);
        });
      });
    });

    context('ComposableStable to ComposableStable', () => {
      before(() => {
        address = '0x74C3646ADad7e196102D1fE35267aDFD401A568b';
      });

      it('should build a migration using exit / join', async () => {
        const pool = composableStable;
        const balance = await ERC20(pool.address, signer).balanceOf(address);

        const peek = await migrations.pool2pool(
          address,
          pool.id,
          pool.id,
          balance
        );
        const peekResult = await signer.call({ ...peek, gasLimit: 8e6 });
        const expectedBptOut = Migrations.getMinBptOut(peekResult);

        // NOTICE: When swapping from Linear Pools, the swap will query for the current wrapped token rate.
        // It is possible that the rate changes between the static call checking for the BPT out
        // and the actual swap, causing it to fail with BAL#208.
        // To avoid this, we can add a small buffer to the min BPT out amount. eg. 0.0000001% of the BPT amount.
        const buffer = BigInt(expectedBptOut) / BigInt(1e9);
        const minBptOut = String(BigInt(expectedBptOut) - buffer);

        const txParams = await migrations.pool2pool(
          address,
          pool.id,
          pool.id,
          balance,
          minBptOut
        );

        await (await signer.sendTransaction(txParams)).wait();

        const balanceAfter = await ERC20(pool.address, signer).balanceOf(
          address
        );

        // NOTICE: We don't know the exact amount of BPT that will be minted,
        // because swaps from the linear pool are not deterministic due to external rates
        expect(BigInt(balanceAfter)).to.satisfy(
          (v: bigint) => v > v - v / buffer && v < v + v / buffer
        );
      });
    });

    context('Weighted to Weighted between different pools', () => {
      before(() => {
        address = '0x673CA7d2faEB3c02c4cDB9383344ae5c9738945e';
      });

      it('should build a migration using exit / join', async () => {
        const from = vitaDao1;
        const to = vitaDao2;
        const balance = await ERC20(from.address, signer).balanceOf(address);
        const peek = await migrations.pool2pool(
          address,
          from.id,
          to.id,
          balance
        );
        const peekResult = await signer.call({ ...peek, gasLimit: 8e6 });
        const expectedBptOut = Migrations.getMinBptOut(peekResult);

        const txParams = await migrations.pool2pool(
          address,
          from.id,
          to.id,
          balance,
          expectedBptOut
        );

        await (await signer.sendTransaction(txParams)).wait();

        const balanceAfter = await ERC20(to.address, signer).balanceOf(address);

        expect(String(balanceAfter)).to.be.eq(expectedBptOut);
      });
    });

    context('gauge to gauge', () => {
      before(() => {
        address = '0xaF297deC752c909092A117A932A8cA4AaaFF9795';
      });

      it('should build a migration using exit / join and stake tokens in the gauge', async () => {
        const from = '0xa6468eca7633246dcb24e5599681767d27d1f978';
        const to = '0x57ab3b673878c3feab7f8ff434c40ab004408c4c';
        const balance = await ERC20(from, provider).balanceOf(address);

        const txParams = await migrations.gauge2gauge(
          address,
          from,
          to,
          balance
        );

        await (await signer.sendTransaction(txParams)).wait();

        const balanceAfter = await ERC20(to, provider).balanceOf(address);

        expect(balanceAfter).to.be.eql(balance);
      });
    });
  });

  context('polygon', () => {
    const {
      addresses: { contracts },
    } = BALANCER_NETWORK_CONFIG[137];
    const relayerAddress = contracts.relayerV5 as string;
    const provider = new JsonRpcProvider('http://127.0.0.1:8137');
    const vault = Vault__factory.connect(contracts.vault, provider);
    let signer: JsonRpcSigner;
    let address: string;

    const migrations = new Migrations(
      relayerAddress,
      polygonPoolRepository,
      gaugesRepository,
      provider
    );

    beforeEach(async () => {
      await reset('https://rpc.ankr.com/polygon', provider, 41098000);
      signer = await impersonateAccount(address, provider);

      // approve relayer
      await vault
        .connect(signer)
        .setRelayerApproval(address, relayerAddress, true);
    });

    context('ComposableStable to ComposableStable', () => {
      before(() => {
        address = '0x92a0b2c089733bef43ac367d2ce7783526aea590';
      });

      it('should build a migration using exit / join', async () => {
        const pool = polygonComposableStable;
        const balance = await ERC20(pool.address, signer).balanceOf(address);

        const peek = await migrations.pool2pool(
          address,
          pool.id,
          pool.id,
          balance
        );
        const peekResult = await signer.call({ ...peek, gasLimit: 8e6 });
        const expectedBptOut = Migrations.getMinBptOut(peekResult);

        // NOTICE: When swapping from Linear Pools, the swap will query for the current wrapped token rate.
        // It is possible that the rate changes between the static call checking for the BPT out
        // and the actual swap, causing it to fail with BAL#208.
        // To avoid this, we can add a small buffer to the min BPT out amount. eg. 0.0000001% of the BPT amount.
        const buffer = BigInt(expectedBptOut) / BigInt(1e14); // 0.0000001%
        const minBptOut = String(BigInt(expectedBptOut) - buffer);

        const txParams = await migrations.pool2pool(
          address,
          pool.id,
          pool.id,
          balance,
          minBptOut
        );

        await (await signer.sendTransaction(txParams)).wait();

        const balanceAfter = await ERC20(pool.address, signer).balanceOf(
          address
        );

        // NOTICE: We don't know the exact amount of BPT that will be minted,
        // because swaps from the linear pool are not deterministic due to external rates
        expect(BigInt(balanceAfter)).to.satisfy(
          (v: bigint) => v > v - buffer && v < v + buffer
        );
      });
    });
  });
});
