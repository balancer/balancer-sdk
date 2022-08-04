import axios from 'axios';
import { Pool } from '@/types';
import { jsonToGraphQLQuery } from 'json-to-graphql-query';

export default class BalancerAPIClient {
  constructor(private readonly url: string, private readonly apiKey: string) {}

  public async get(query: any): Promise<any> {
    try {
      const payload = this.toPayload(query);
      const {
        data: { data },
      } = await axios.post(this.url, payload, {
        headers: {
          'x-api-key': this.apiKey,
        },
      });
      return data;
    } catch (error) {
      console.error(error);
    }

    return [];
  }

  public toPayload(query: any): any {
    return JSON.stringify({ query: jsonToGraphQLQuery({ query }) });
  }
}
