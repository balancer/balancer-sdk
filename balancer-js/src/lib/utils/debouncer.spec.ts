import { expect } from 'chai';
import { Debouncer } from './debouncer';

const randomString = (length: number) =>
  Array.from({ length }, () =>
    String.fromCharCode(Math.floor(Math.random() * 26) + 97)
  ).join('');

describe('Debouncer', () => {
  it('should call the original async function after the specified wait time', async () => {
    let called = false;
    const asyncFunc = async () => {
      called = true;
    };
    const subject = new Debouncer<void, void>(asyncFunc, 50);
    subject.fetch();

    expect(called).to.eq(false);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(called).to.eq(true);
  });

  it('should prevent the original async function from being called multiple times within the specified wait time', async () => {
    let callCount = 0;
    const asyncFunc = async () => {
      callCount++;
    };
    const subject = new Debouncer<void, void>(asyncFunc, 50);

    subject.fetch();
    subject.fetch();
    subject.fetch();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(callCount).to.eq(1);
  });

  it('should aggregate attributes', async () => {
    let attrs: string[] = [];
    const asyncFunc = async (asyncAttrs: string[]) => {
      attrs = asyncAttrs;
    };
    const subject = new Debouncer<void, string>(asyncFunc, 50);
    const testStrings = Array.from({ length: 5 }, () => randomString(5));

    testStrings.forEach((str) => {
      subject.fetch(str);
    });
    expect(attrs).to.eql([]);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(attrs).to.eql(testStrings);
  });

  it("shouldn't fetch the same attribute twice", async () => {
    let attrs: string[] = [];
    const asyncFunc = async (asyncAttrs: string[]) => {
      attrs = asyncAttrs;
    };
    const subject = new Debouncer<void, string>(asyncFunc, 50);

    subject.fetch('just once');
    subject.fetch('just once');

    expect(attrs).to.eql([]);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(attrs).to.eql(['just once']);
  });

  it('returns a new promise when one is already running', async () => {
    let attrs: string[] = [];
    const asyncFunc = async (asyncAttrs: string[]) =>
      new Promise((resolve) =>
        setTimeout(() => {
          attrs = asyncAttrs;
          resolve(attrs);
        }, 50)
      );
    const subject = new Debouncer<unknown, string>(asyncFunc, 30);

    const p1 = subject.fetch('first');
    expect(attrs).to.eql([]);
    await new Promise((resolve) => setTimeout(resolve, 40));
    const p2 = subject.fetch('second');
    expect(await p1).to.eql(['first']);
    expect(await p2).to.eql(['second']);
  });

  it('rejects the promise when debounced function fails', async () => {
    const asyncFunc = async (asyncAttrs: string[]) =>
      Promise.reject(asyncAttrs[0]);
    const subject = new Debouncer<unknown, string>(asyncFunc, 0);

    return subject.fetch('anything').catch((error) => {
      expect(error).to.eql('anything');
    });
  });
});
