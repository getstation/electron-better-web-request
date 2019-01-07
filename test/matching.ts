import assert from 'assert';

import BetterWebRequest from '../src/electron-better-web-request';

const foo = {
  name: 'foo',
  urls: ['http://*/foo*'],
  action: () => {},
  context: {},
};

const bar = {
  name: 'bar',
  urls: ['http://*/bar*'],
  action: () => {},
  context: {},
};

const baz = {
  name: 'baz',
  urls: ['http://*/baz', '*://*.bazile.com'],
  action: () => {},
  context: {},
};

const mix = {
  name: 'mix',
  urls: ['http://*.hello.*', 'http://*/foo*'],
  action: () => {},
  context: {},
};

const mockedWebRequest = {};

describe('Matching Url Patterns', () => {
  it('matches one listener with ONE pattern', () => {
    const listeners = [foo, bar];
    const webRq = new BetterWebRequest(mockedWebRequest);

    const res = webRq.matchListeners('http://test/foo', listeners);
    assert.equal(res.length, 1);
    // @ts-ignore
    assert.equal(res[0].name, 'foo');
  });

  it('matches one listener with MULTIPLE patterns', () => {
    const listeners = [mix, bar];
    const webRq = new BetterWebRequest(mockedWebRequest);

    const res = webRq.matchListeners('http://test.hello.io', listeners);
    assert.equal(res.length, 1);
    // @ts-ignore
    assert.equal(res[0].name, 'mix');
  });

  it('matches many listeners when possible', () => {
    const listeners = [mix, bar, foo];
    const webRq = new BetterWebRequest(mockedWebRequest);

    const res = webRq.matchListeners('http://test/foo', listeners);
    assert.equal(res.length, 2);
    // @ts-ignore
    assert.equal(res[0].name, 'mix');
    // @ts-ignore
    assert.equal(res[1].name, 'foo');
  });

  it('filters out all listeners when none matches', () => {
    const listeners = [bar, baz];
    const webRq = new BetterWebRequest(mockedWebRequest);

    const res = webRq.matchListeners('http://test/foo', listeners);
    assert.equal(res.length, 0);
  });

  it('handles empty listeners argument', () => {
    const webRq = new BetterWebRequest(mockedWebRequest);

    const res = webRq.matchListeners('http://test/foo', []);
    assert.equal(res.length, 0);
  });

  it('handles empty url argument', () => {
    const listeners = [bar, baz];
    const webRq = new BetterWebRequest(mockedWebRequest);

    const res = webRq.matchListeners('', listeners);
    assert.equal(res.length, 0);
  });

  it('handles incorrect url', () => {
    const listeners = [bar, baz];
    const webRq = new BetterWebRequest(mockedWebRequest);

    const res = webRq.matchListeners('yolo', listeners);
    assert.equal(res.length, 0);
  });
});
