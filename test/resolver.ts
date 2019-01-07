import assert from 'assert';

import BetterWebRequest from '../src/electron-better-web-request';

const mockedWebRequest = {
  onBeforeRequest: () => {},
  onBeforeSendHeaders: () => {},
};

describe('Resolver', () => {
  it('has a default resolver', () => {
    assert.ok(true);
    const webRq = new BetterWebRequest(mockedWebRequest);
    assert.ok(webRq);
  });

  it('can use a custom resolver', () => {
    assert.ok(true);
  });

  describe('Default resolver', () => {
    it('allooooooooo', () => {

    });
  });
});
