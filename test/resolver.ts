import assert from 'assert';
import { EventEmitter } from 'events';

import BetterWebRequest from '../src/electron-better-web-request';

describe('Resolver', () => {
  describe('Default resolver', () => {
    it('resolves with the last registered listener', () => {
      const trigger = new EventEmitter();
      // Mock the function that registers a listener in electron-web-request (and triggers it)
      const mockedWebRequest = {
        // @ts-ignore
        onBeforeRequest: (filters: any, listenerFactory: any) => {
          // Then trigger the listenerFactory, mimicking a instant trigger
          trigger.on('on-before-request', () => {
            listenerFactory(
              { result : 'failure', method : 'onBeforeRequest', url: 'test.url' },
              (response: any) => assert.equal(response.result, 'BAZ')
            );
          });
        },
      };

      // Create different listeners with an exepected signature
      const fakeListenerFoo = () => assert.fail('Foo listener should not have been called');
      const fakeListenerBar = () => assert.fail('Foo listener should not have been called');
      const fakeListenerBaz = (details: any, callback: Function) => {
        const response = { ...details, ...{ result: 'BAZ' } };
        callback(response);
      };

      // Add listeners
      const webRq = new BetterWebRequest(mockedWebRequest);
      assert.doesNotThrow(() => {
        webRq.addListener('onBeforeRequest', { urls: ['test.url'] }, fakeListenerFoo, { origin: 'FOO' });
        webRq.addListener('onBeforeRequest', { urls: ['test.url'] }, fakeListenerBar, { origin: 'BAR' });
        webRq.addListener('onBeforeRequest', { urls: ['test.url'] }, fakeListenerBaz, { origin: 'BAZ' });
      });

      // Pray
      trigger.emit('on-before-request');
    });
  });

  it('can use a custom resolver', () => {
    const mockedWebRequest = {
      onBeforeRequest: () => {},
    };
    const fakeListener = () => {};

    // Set a custom resolver, then add a listener to mock the trigger & call
    const webRq = new BetterWebRequest(mockedWebRequest);
    webRq.setConflictResolver('onBeforeRequest', () => {
      assert.ok(true, 'Custom resolver has been called');
    });
    webRq.addListener('onBeforeRequest', { urls: ['test.url'] }, fakeListener, { origin: 'FOO' });
  });
});
