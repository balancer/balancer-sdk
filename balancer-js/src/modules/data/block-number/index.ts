import { Findable } from '../types';
import axios from 'axios';

const query = (timestamp: string) => `{
  blocks(first: 1, orderBy: timestamp, orderDirection: asc, where: { timestamp_gt: ${timestamp} }) {
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
  endpoint: string,
  timestamp: string
): Promise<number> => {
  const payload = {
    query: query(timestamp),
  };

  const response = await axios.post(endpoint, payload);

  const {
    data: { blocks },
  } = response.data as BlockNumberResponse;

  return parseInt(blocks[0].number);
};

export class BlockNumberRepository implements Findable<number> {
  blocks: { [ts: string]: Promise<number> } = {};

  constructor(private endpoint: string) {}

  async find(from: string): Promise<number | undefined> {
    if (from == 'dayAgo') {
      const dayAgo = `${Math.floor(Date.now() / 1000) - 86400}`;
      if (!this.blocks[dayAgo]) {
        this.blocks = {
          ...this.blocks,
          [dayAgo]: fetchBlockByTime(this.endpoint, dayAgo),
        };
      }
      return this.blocks[dayAgo];
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async findBy(attribute = '', value = ''): Promise<number | undefined> {
    return;
  }
}
