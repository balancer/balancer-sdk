import { BaseProvider } from '@ethersproject/providers';
import { Network } from '../..';

/**
 * This MockProvider serves to prevent/catch external calls the Provider might make.
 */
export default class MockProvider extends BaseProvider {
  constructor(network = Network.KOVAN) {
    super(network);
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  call = function () {
    throw new Error(
      'MockProvider: API calls are blocked! Please stub out your method'
    );
  };
}
