import { SubgraphPoolBase, Network } from '@/.';
import { getNetworkConfig } from '@/modules/sdk.helpers';
import { getOnChainBalances } from '@/modules/sor/pool-data/onChainData';
import { JsonRpcProvider } from '@ethersproject/providers';
import { factories } from '../factories';

export const B_50WBTC_50WETH = factories.subgraphPoolBase.build({
  id: '0xa6f548df93de924d73be7d25dc02554c6bd66db500020000000000000000000e',
  address: '0xa6f548df93de924d73be7d25dc02554c6bd66db5',
  tokens: [
    factories.subgraphToken.transient({ symbol: 'wETH' }).build(),
    factories.subgraphToken.transient({ symbol: 'wBTC' }).build(),
  ],
});

export const BAL_WETH = factories.subgraphPoolBase.build({
  id: '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014',
  address: '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56',
  tokens: [
    factories.subgraphToken.transient({ symbol: 'wETH' }).build(),
    factories.subgraphToken.transient({ symbol: 'BAL' }).build(),
  ],
});

export const AURA_BAL_STABLE = factories.subgraphPoolBase.build({
  id: '0x3dd0843a028c86e0b760b1a76929d1c5ef93a2dd000200000000000000000249',
  address: '0x3dd0843a028c86e0b760b1a76929d1c5ef93a2dd',
  tokens: [
    factories.subgraphToken.transient({ symbol: 'auraBAL' }).build(),
    factories.subgraphToken.transient({ symbol: 'B80BAL20WETH' }).build(),
  ],
  poolType: 'Stable',
});

export const GRAVI_AURA = factories.subgraphPoolBase.build({
  id: '0x0578292cb20a443ba1cde459c985ce14ca2bdee5000100000000000000000269',
  address: '0x0578292CB20a443bA1CdE459c985CE14Ca2bDEe5'.toLowerCase(),
  tokens: [
    factories.subgraphToken.transient({ symbol: 'auraBAL' }).build(),
    factories.subgraphToken.transient({ symbol: 'wETH' }).build(),
    factories.subgraphToken.transient({ symbol: 'graviAura' }).build(),
  ],
});

export const B_stETH_STABLE = factories.subgraphPoolBase.build({
  id: '0x32296969ef14eb0c6d29669c550d4a0449130230000200000000000000000080',
  address: '0x32296969Ef14EB0c6d29669C550D4a0449130230'.toLowerCase(),
  tokens: [
    factories.subgraphToken.transient({ symbol: 'wETH' }).build(),
    factories.subgraphToken.transient({ symbol: 'wstETH' }).build(),
  ],
  poolType: 'MetaStable',
});

export const B_50auraBAL_50wstETH = factories.subgraphPoolBase.build({
  id: '0x0731399bd09ced6765ff1e0cb884bd223298a5a6000200000000000000000398',
  address: '0x0731399bD09CED6765ff1e0cB884bd223298a5a6'.toLowerCase(),
  tokens: [
    factories.subgraphToken.transient({ symbol: 'wstETH' }).build(),
    factories.subgraphToken.transient({ symbol: 'auraBAL' }).build(),
  ],
});

export const getForkedPools = async (
  provider: JsonRpcProvider,
  pools: SubgraphPoolBase[] = [B_50WBTC_50WETH]
): Promise<SubgraphPoolBase[]> => {
  const network = getNetworkConfig({ network: Network.MAINNET, rpcUrl: '' });

  // btcEthPool from mainnet, balances and total shares are fetched from on chain data
  const onChainPools = await getOnChainBalances(
    pools,
    network.addresses.contracts.multicall,
    network.addresses.contracts.vault,
    provider
  );

  return onChainPools;
};
