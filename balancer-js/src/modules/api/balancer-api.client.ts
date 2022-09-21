import axios from 'axios';
import { jsonToGraphQLQuery } from 'json-to-graphql-query';

export default class BalancerAPIClient {
  constructor(private readonly url: string, private readonly apiKey: string) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async get(query: unknown): Promise<any> {
    try {
      const payload = this.toPayload(query);
      const { data } = await axios.post(this.url, payload, {
        headers: {
          'x-api-key': this.apiKey,
        },
      });
      if (data.errors) {
        throw new Error(
          data.errors.map((error: Error) => error.message).join(',')
        );
      }
      return data.data;
    } catch (error) {
      console.error(error);
      throw error;
    }

    return [];
  }

  public toPayload(query: unknown): unknown {
    return JSON.stringify({ query: jsonToGraphQLQuery({ query }) });
  }
}
