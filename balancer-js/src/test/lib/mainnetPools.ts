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
