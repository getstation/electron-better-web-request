import assert = require('assert');

import BetterWebRequest from '../src/electron-better-web-request';

describe('Electron Better Web Request', () => {
  beforeEach(() => {
    BetterWebRequest.reset();
  });

  it('executes', () => {
    // Mock the function that registers a listener in electron-web-request
    const mockedWebRequest = {
      onBeforeRequest: (filters: any, listener: any) => {
        // Just assert the filters
        assert.equal(filters[0], 'test.url');
        // Then trigger the given listener, mimicking a instant trigger
        console.log('2');
        listener({ result : 'failure', method : 'onBeforeRequest', url: 'test.url' }, (response: any) => {
          console.log(response);
          assert.equal(response.result, 'success');
        });
      },
    };

    // Create a listener with an exepected signature
    const fakeListener = (details: any, callback: Function) => {
      details.result = 'success';
      console.log(details);
      console.log(callback);
      console.log('1');
      callback(details);
    };

    // Add the listener
    const webRq = new BetterWebRequest(mockedWebRequest);
    webRq.addListener('onBeforeRequest', { urls: ['test.url'] }, fakeListener, { origin: 'TEST' });

    // Pray

  });

  it('prepares the listener appliers on web request + context', () => {
    assert.fail('Not implemented yet');
  });

  it('resolves', () => {
    assert.fail('Not implemented yet');
  });

  it('uses callback when the method is with callback', () => {
    assert.fail('Not implemented yet');
  });

  it('does not use callback when the method is without callback', () => {
    assert.fail('Not implemented yet');
  });
});
