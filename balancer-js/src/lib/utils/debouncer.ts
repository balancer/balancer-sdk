/* eslint-disable @typescript-eslint/no-empty-function */

/**
 * Debouncer for different attributes requested over time, which need to be aggregated into a single resolving call
 *
 * Choosing deferred promise since we have setTimeout that returns a promise
 * Some reference for history buffs: https://github.com/petkaantonov/bluebird/wiki/Promise-anti-patterns
 */

interface Promised<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}

const makePromise = <T>(): Promised<T> => {
  let resolve: (value: T) => void = () => {};
  let reject: (reason: unknown) => void = () => {};
  const promise = new Promise<T>((res, rej) => {
    [resolve, reject] = [res, rej];
  });
  return { promise, reject, resolve };
};

/**
 * Aggregates attributes and exectutes a debounced call
 *
 * @param fn Function to debounce
 * @param wait Debouncing waiting time [ms]
 * @param limit Maximum number of attributes to execute in one promise
 * @returns Debouncer instance
 */
export class Debouncer<T, A> {
  requestSets = <Set<A>[]>[]; // new Set<A>(); // collection of requested attributes
  promisedCalls: Promised<T>[] = []; // When requesting a price we return a deferred promise
  promisedCount = 0; // New request coming when setTimeout is executing will make a new promise
  timeout?: ReturnType<typeof setTimeout>;
  debounceCancel = (): void => {}; // Allow to cancel mid-flight requests

  constructor(
    private fn: (attrs: A[]) => Promise<T>,
    private wait = 200,
    private limit = 100
  ) {}

  fetch(attr?: A): Promise<T> {
    this.requestSets[this.promisedCount] ||= new Set<A>();

    // Accumulate attributes for debounced execution
    if (attr) {
      this.requestSets[this.promisedCount].add(attr);
    }

    // Execute immediately when limit is reached
    if (this.requestSets[this.promisedCount].size >= this.limit) {
      return this.execute(0);
    }

    // Return a running promise
    if (this.promisedCalls[this.promisedCount]) {
      return this.promisedCalls[this.promisedCount].promise;
    }

    // If no promise is running, start a new one
    return this.execute(this.wait);
  }

  execute(timeout = 0): Promise<T> {
    // if no promise is running, start a new one
    if (!this.promisedCalls[this.promisedCount]) {
      this.promisedCalls[this.promisedCount] = makePromise();
    }

    const { promise, resolve, reject } = this.promisedCalls[this.promisedCount];

    if (this.timeout) {
      clearTimeout(this.timeout);
    }

    const call = () => {
      const requestAttrs = [...this.requestSets[this.promisedCount]];
      this.promisedCount++;
      this.fn(requestAttrs)
        .then((results) => {
          resolve(results);
          this.debounceCancel = () => {};
        })
        .catch((reason) => {
          if (
            reason.response &&
            reason.response.data &&
            reason.response.data.error
          ) {
            reason = reason.response.data.error;
          }
          reject(reason);
        });
    };

    if (timeout > 0) {
      this.timeout = setTimeout(call.bind(this), timeout);
    } else {
      call();
    }

    this.debounceCancel = () => {
      if (this.timeout) {
        clearTimeout(this.timeout);
      }
      reject('Cancelled');
      delete this.promisedCalls[this.promisedCount];
    };

    return promise;
  }
}
