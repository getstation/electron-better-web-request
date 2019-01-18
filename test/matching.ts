import assert from 'assert';

import { BetterWebRequest } from '../src/electron-better-web-request';

const foo = {
  id: 'foo',
  urls: ['http://*/foo*'],
  action: () => {},
  context: { order: 1 },
};

const bar = {
  id: 'bar',
  urls: ['http://*/bar*'],
  action: () => {},
  context: { order: 2 },
};

const baz = {
  id: 'baz',
  urls: ['http://*/baz', '*://*.bazile.com/'],
  action: () => {},
  context: { order: 3 },
};

const mix = {
  id: 'mix',
  urls: ['http://*.hello.com/', 'http://*/foo*'],
  action: () => {},
  context: { order: 4 },
};

const mockedWebRequest = {};

describe('Matching Url Patterns', () => {
  it('matches one listener with ONE pattern', () => {
    const listeners = new Map([['foo', foo], ['bar', bar]]);
    const webRq = new BetterWebRequest(mockedWebRequest);

    const res = webRq.matchListeners('http://test/foo', listeners);
    assert.equal(res.length, 1);
    // @ts-ignore
    assert.equal(res[0].id, 'foo');
  });

  it('matches one listener with MULTIPLE patterns', () => {
    const listeners = new Map([['mix', mix], ['bar', bar]]);
    const webRq = new BetterWebRequest(mockedWebRequest);

    const res = webRq.matchListeners('http://test.hello.com', listeners);
    assert.equal(res.length, 1);
    // @ts-ignore
    assert.equal(res[0].id, 'mix');
  });

  it('matches many listeners when possible', () => {
    const listeners = new Map([['mix', mix], ['bar', bar], ['foo', foo]]);
    const webRq = new BetterWebRequest(mockedWebRequest);

    const res = webRq.matchListeners('http://test/foo', listeners);
    assert.equal(res.length, 2);
    // @ts-ignore
    assert.equal(res[0].id, 'mix');
    // @ts-ignore
    assert.equal(res[1].id, 'foo');
  });

  it('filters out all listeners when none matches', () => {
    const listeners = new Map([['bar', bar], ['baz', baz]]);
    const webRq = new BetterWebRequest(mockedWebRequest);

    const res = webRq.matchListeners('http://test/foo', listeners);
    assert.equal(res.length, 0);
  });

  it('handles empty listeners argument', () => {
    const webRq = new BetterWebRequest(mockedWebRequest);

    const res = webRq.matchListeners('http://test/foo', new Map());
    assert.equal(res.length, 0);
  });

  it('handles empty url argument', () => {
    const listeners = new Map([['bar', bar], ['baz', baz]]);
    const webRq = new BetterWebRequest(mockedWebRequest);

    const res = webRq.matchListeners('', listeners);
    assert.equal(res.length, 0);
  });

  it('handles incorrect url', () => {
    const listeners = new Map([['bar', bar], ['baz', baz]]);
    const webRq = new BetterWebRequest(mockedWebRequest);

    const res = webRq.matchListeners('yolo', listeners);
    assert.equal(res.length, 0);
  });
});
