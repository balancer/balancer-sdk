// yarn test:only ./src/modules/liquidity-managment/migrations.integrations.spec.ts
import { expect } from 'chai';
import { JsonRpcProvider } from '@ethersproject/providers';
import { ERC20__factory, Vault__factory } from '@/contracts';
import { Network, Relayer, Pool } from '@/.';
import { BALANCER_NETWORK_CONFIG } from '@/lib/constants/config';
import { impersonateAccount, reset, setTokenBalance } from '@/test/lib/utils';
import {
  vitaDao1,
  vitaDao2,
  metaStable,
  composableStable,
  poolsRepository,
  gaugesRepository,
  polygonComposableStable,
  polygonPoolRepository,
} from './migrations/builder.spec-helpers';
import { Migrations } from './migrations';

const migrations = (network: 1 | 137) => {
  const {
    addresses: {
      contracts: { balancerRelayer: relayerAddress, vault: vaultAddress },
    },
  } = BALANCER_NETWORK_CONFIG[network];

  const rpcUrls = {
    [Network.MAINNET]: 'http://127.0.0.1:8545/',
    [Network.POLYGON]: 'http://127.0.0.1:8137/',
  };

  const remoteRpcUrls = {
    [Network.MAINNET]: 'https://rpc.ankr.com/eth',
    [Network.POLYGON]: 'https://rpc.ankr.com/polygon',
  };

  const blockNumbers = {
    [Network.MAINNET]: 16950000,
    [Network.POLYGON]: 42462957,
  };

  const poolsRepos = {
    [Network.MAINNET]: poolsRepository,
    [Network.POLYGON]: polygonPoolRepository,
  };

  const provider = new JsonRpcProvider(rpcUrls[network]);
  let signer = provider.getSigner();
  let address: string;

  const impersonate = async (impersonatedAddress: string) => {
    signer = await impersonateAccount(impersonatedAddress, provider);
    address = impersonatedAddress;
  };

  const defaultUser = async () => {
    signer = provider.getSigner();
    address = await signer.getAddress();
  };

  const vault = Vault__factory.connect(vaultAddress, provider);

  const migrationsInstance = new Migrations({
    relayerAddress,
    poolsRepository: poolsRepos[network],
    gaugesRepository,
    provider,
  });

  const signRelayerApproval = () =>
    Relayer.signRelayerApproval(relayerAddress, address, signer, vault);

  const approveRelayer = () =>
    vault.connect(signer).setRelayerApproval(address, relayerAddress, true);

  const runGauge2Gauge = async (
    from: string,
    to: string,
    authorisation?: string
  ) => {
    const balanceBefore = '1000000000000000000';

    await setTokenBalance(signer, from, 1, balanceBefore, true);

    const txParams = await migrationsInstance.gauge2gauge({
      user: address,
      from,
      to,
      balance: balanceBefore,
      authorisation,
    });

    await signer.sendTransaction(txParams);

    const balanceAfter = String(
      await ERC20__factory.connect(to, signer).balanceOf(address)
    );

    return { balanceBefore, balanceAfter };
  };

  const runPool2Pool = async (from: Pool, to: Pool) => {
    const balanceBefore = String(
      await ERC20__factory.connect(from.address, signer).balanceOf(address)
    );

    const peek = await migrationsInstance.pool2pool({
      user: address,
      from: from.id,
      to: to.id,
      balance: balanceBefore,
    });

    const peekResult = await signer.call({ ...peek });

    const expectedBptOut = Migrations.getExpectedBptOut(peekResult);

    // NOTICE: When swapping from Linear Pools, the swap will query for the current wrapped token rate.
    // It is possible that the rate changes between the static call checking for the BPT out
    // and the actual swap, causing it to fail with BAL#208.
    // To avoid this, we can add a small buffer to the min BPT out amount. eg. 0.0000001% of the BPT amount.
    const buffer = BigInt(expectedBptOut) / BigInt(1e9);
    const minBptOut = String(BigInt(expectedBptOut) - buffer);

    const txParams = await migrationsInstance.pool2pool({
      user: address,
      from: from.id,
      to: to.id,
      balance: balanceBefore,
      minBptOut,
    });

    await (await signer.sendTransaction(txParams)).wait();

    const balanceAfter = String(
      await ERC20__factory.connect(to.address, signer).balanceOf(address)
    );

    return { balanceBefore, balanceAfter, expectedBptOut, minBptOut };
  };

  const runPool2PoolWithGauges = async (from: Pool, to: Pool) => {
    const gauge = (await gaugesRepository.findBy('poolId', from.id)) as {
      id: string;
    };
    const balanceBefore = String(
      await ERC20__factory.connect(gauge.id, signer).balanceOf(address)
    );

    const peek = await migrationsInstance.pool2poolWithGauges({
      user: address,
      from: from.id,
      to: to.id,
      balance: balanceBefore,
    });
    const peekResult = await signer.call({ ...peek });
    const expectedBptOut = Migrations.getExpectedBptOut(peekResult);

    // NOTICE: When swapping from Linear Pools, the swap will query for the current wrapped token rate.
    // It is possible that the rate changes between the static call checking for the BPT out
    // and the actual swap, causing it to fail with BAL#208.
    // To avoid this, we can add a small buffer to the min BPT out amount. eg. 0.0000001% of the BPT amount.
    const buffer = BigInt(expectedBptOut) / BigInt(1e9);
    const minBptOut = String(BigInt(expectedBptOut) - buffer);

    const txParams = await migrationsInstance.pool2poolWithGauges({
      user: address,
      from: from.id,
      to: to.id,
      balance: balanceBefore,
      minBptOut,
    });

    await (await signer.sendTransaction(txParams)).wait();

    const balanceAfter = String(
      await ERC20__factory.connect(gauge.id, signer).balanceOf(address)
    );

    return { balanceBefore, balanceAfter, expectedBptOut };
  };

  before(() => reset(remoteRpcUrls[network], provider, blockNumbers[network]));

  return {
    impersonate,
    defaultUser,
    signRelayerApproval,
    approveRelayer,
    runGauge2Gauge,
    runPool2Pool,
    runPool2PoolWithGauges,
  };
};

describe('Migrations', function () {
  this.timeout(60000);

  context('mainnet', () => {
    const {
      approveRelayer,
      impersonate,
      defaultUser,
      signRelayerApproval,
      runGauge2Gauge,
      runPool2Pool,
      runPool2PoolWithGauges,
    } = migrations(Network.MAINNET);

    context("user doesn't have an approved relayer", () => {
      it('should build gauge2gauge with signed authorisation', async () => {
        await defaultUser();
        const from = '0xa6468eca7633246dcb24e5599681767d27d1f978';
        const to = '0x57ab3b673878c3feab7f8ff434c40ab004408c4c';
        const authorisation = await signRelayerApproval();
        const { balanceBefore, balanceAfter } = await runGauge2Gauge(
          from,
          to,
          authorisation
        );
        expect(balanceAfter).to.be.eq(balanceBefore);
      });
    });

    context('with approved relayer', () => {
      beforeEach(() => approveRelayer());

      context('MetaStable to MetaStable', () => {
        context('user with BPT', async () => {
          before(() =>
            impersonate('0x21ac89788d52070D23B8EaCEcBD3Dc544178DC60')
          );

          it('should build a migration using exit / join', async () => {
            const { expectedBptOut, balanceAfter } = await runPool2Pool(
              metaStable,
              metaStable
            );
            expect(balanceAfter).to.be.eq(expectedBptOut);
          });
        });

        context('user with staked BPT', async () => {
          before(() =>
            impersonate('0xe8343fd029561289CF7359175EE84DA121817C71')
          );

          it('should build a migration using exit / join and stake tokens in the gauge', async () => {
            const { expectedBptOut, balanceAfter } =
              await runPool2PoolWithGauges(metaStable, metaStable);
            expect(balanceAfter).to.be.eq(expectedBptOut);
          });
        });
      });

      context('ComposableStable to ComposableStable', () => {
        context('user with BPT', async () => {
          before(() =>
            impersonate('0x74C3646ADad7e196102D1fE35267aDFD401A568b')
          );

          it('should build a migration using exit / join', async () => {
            const { balanceAfter, minBptOut } = await runPool2Pool(
              composableStable,
              composableStable
            );

            // NOTICE: We don't know the exact amount of BPT that will be minted,
            // because swaps from the linear pool are not deterministic due to external rates
            expect(BigInt(balanceAfter)).to.satisfy(
              (v: bigint) => v > BigInt(minBptOut)
            );
          });
        });
      });

      context('Weighted to Weighted between different pools', () => {
        before(() => impersonate('0x673CA7d2faEB3c02c4cDB9383344ae5c9738945e'));

        it('should build a migration using exit / join', async () => {
          const { balanceAfter, expectedBptOut } = await runPool2Pool(
            vitaDao1,
            vitaDao2
          );
          expect(balanceAfter).to.be.eq(expectedBptOut);
        });
      });

      context('gauge to gauge', () => {
        before(() => impersonate('0xaF297deC752c909092A117A932A8cA4AaaFF9795'));

        it('should build a migration using exit / join and stake tokens in the gauge', async () => {
          const from = '0xa6468eca7633246dcb24e5599681767d27d1f978';
          const to = '0x57ab3b673878c3feab7f8ff434c40ab004408c4c';
          const { balanceBefore, balanceAfter } = await runGauge2Gauge(
            from,
            to
          );

          expect(balanceAfter).to.be.eql(balanceBefore);
        });
      });
    });
  });

  context('polygon', () => {
    const { approveRelayer, impersonate, runPool2Pool } = migrations(
      Network.POLYGON
    );

    beforeEach(() => approveRelayer());

    context('ComposableStable to ComposableStable', () => {
      before(() => impersonate('0xe80a6a7b4fdadf0aa59f3f669a8d394d1d4da86b'));

      it('should build a migration using exit / join', async () => {
        const { balanceAfter, minBptOut } = await runPool2Pool(
          polygonComposableStable,
          polygonComposableStable
        );

        // NOTICE: We don't know the exact amount of BPT that will be minted,
        // because swaps from the linear pool are not deterministic due to external rates
        expect(BigInt(balanceAfter)).to.satisfy(
          (v: bigint) => v > BigInt(minBptOut)
        );
      });
    });
  });
});
