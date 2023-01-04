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
 */
export class Debouncer<T, A> {
  requestSet = new Set<A>(); // collection of requested attributes
  promisedCalls: Promised<T>[] = []; // When requesting a price we return a deferred promise
  promisedCount = 0; // New request coming when setTimeout is executing will make a new promise
  timeout?: ReturnType<typeof setTimeout>;
  debounceCancel = (): void => {}; // Allow to cancel mid-flight requests

  constructor(private fn: (attrs: A[]) => Promise<T>, private wait = 200) {}

  fetch(attr?: A): Promise<T> {
    if (attr) {
      this.requestSet.add(attr);
    }

    if (this.promisedCalls[this.promisedCount]) {
      return this.promisedCalls[this.promisedCount].promise;
    }

    this.promisedCalls[this.promisedCount] = makePromise();

    const { promise, resolve, reject } = this.promisedCalls[this.promisedCount];

    if (this.timeout) {
      clearTimeout(this.timeout);
    }

    this.timeout = setTimeout(() => {
      this.promisedCount++; // after execution started any new call will get a new promise
      const requestAttrs = [...this.requestSet];
      this.requestSet.clear(); // clear optimistically assuming successful results
      this.fn(requestAttrs)
        .then((results) => {
          resolve(results);
          this.debounceCancel = () => {};
        })
        .catch((reason) => {
          reject(reason);
          console.error(reason);
        });
    }, this.wait);

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
