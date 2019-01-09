import assert from 'assert';

import BetterWebRequest from '../src/electron-better-web-request';

const mockedWebRequest = {
  onBeforeRequest: () => {},
  onBeforeSendHeaders: () => {},
};

describe('Resolver', () => {
  it('has a default resolver', () => {
    const webRq = new BetterWebRequest(mockedWebRequest);
    assert.ok(webRq);
    assert.fail('Not implemented yet');
  });

  it('can use a custom resolver', () => {
    assert.fail('Not implemented yet');
  });

  it('throws an error if the resolver output is messed up', () => {
    assert.fail('Not implemented yet');
  });

  describe('Default resolver', () => {
    it('allooooooooo', () => {
      assert.fail('Not implemented yet');
    });

    it('gives the last registered listener', () => {
      assert.fail('Not implemented yet');
    });

    it('cancels all listeners when one is cancelling', () => {
      assert.fail('Not implemented yet');
    });
  });
});
