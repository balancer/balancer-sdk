import { Findable } from '../types';

const endpoints = {
  1: 'https://api.thegraph.com/subgraphs/name/blocklytics/ethereum-blocks',
  5: 'https://api.thegraph.com/subgraphs/name/blocklytics/goerli-blocks',
  137: 'https://api.thegraph.com/subgraphs/name/ianlapham/polygon-blocks',
  42161:
    'https://api.thegraph.com/subgraphs/name/ianlapham/arbitrum-one-blocks',
};

const query = (timestamp: string) => `{
  blocks(first: 1, orderBy: number, orderDirection: asc, where: { timestamp_gt: ${timestamp} }) {
    number
  }
}`;

interface BlockNumberResponse {
  data: {
    blocks: [
      {
        number: string;
      }
    ];
  };
}

const fetchBlockByTime = async (
  network: number,
  timestamp: string
): Promise<number> => {
  const endpoint = endpoints[network as keyof typeof endpoints];
  const payload = {
    query: query(timestamp),
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const {
    data: { blocks },
  } = (await response.json()) as BlockNumberResponse;

  return parseInt(blocks[0].number);
};

export class BlockNumberRepository implements Findable<number> {
  constructor(private network: number) {}

  async find(from: string): Promise<number | undefined> {
    if (from == 'dayAgo') {
      const dayAgo = `${Math.floor(Date.now() / 1000) - 86400}`;
      return fetchBlockByTime(this.network, dayAgo);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async findBy(attribute = '', value = ''): Promise<number | undefined> {
    return;
  }
}
