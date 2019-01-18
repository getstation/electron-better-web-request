import assert from 'assert';

import { BetterWebRequest } from '../src/electron-better-web-request';
import {
  IListener,
} from '../src/types';

const mockedWebRequest = {
  onBeforeRequest: () => {},
  onBeforeSendHeaders: () => {},
};

describe('Listeners & Filters Manipulation', () => {
  describe('Getting', () => {
    const webRq = new BetterWebRequest(mockedWebRequest);
    webRq.addListener('onBeforeRequest', { urls: ['foo.url'] }, () => {}, { origin: 'FOO' });
    webRq.addListener('onBeforeSendHeaders', { urls: ['bar.url'] }, () => {}, { origin: 'BAR' });

    it('getListener() returns all listeners', () => {
      const actual = webRq.getListeners();
      const actualOnBeforeRequest = actual.get('onBeforeRequest');
      const actualonBeforeSendHeaders = actual.get('onBeforeSendHeaders');

      if (actual && actualOnBeforeRequest && actualonBeforeSendHeaders) {
        assert.equal(actual.size, 2);
        assert.equal(actualOnBeforeRequest.size, 1);
        assert.equal(actualonBeforeSendHeaders.size, 1);
      } else {
        assert.fail('Map listeners was not correctly initialized');
      }
    });

    it('getListenersFor() returns the correct listeners associated to a method', () => {
      const actual = webRq.getListenersFor('onBeforeRequest');
      if (actual) {
        assert.equal(actual.size, 1);
      } else {
        assert.fail('Listener map has not been initialized for onBeforeRequest');
      }
    });

    it('getFilters() returns all the filters', () => {
      const actual = webRq.getFilters();
      const actualOnBeforeRequest = actual.get('onBeforeRequest');
      const actualonBeforeSendHeaders = actual.get('onBeforeSendHeaders');

      if (actual && actualOnBeforeRequest && actualonBeforeSendHeaders) {
        assert.equal(actual.size, 2);
        assert.equal(actualOnBeforeRequest.size, 1);
        assert.equal(actualonBeforeSendHeaders.size, 1);
      } else {
        assert.fail('Filters map has not been initialized');
      }
    });

    it('getFiltersFor() returns the filters associated to a method', () => {
      const actual = webRq.getFiltersFor('onBeforeRequest');
      if (actual) {
        assert.equal(actual.size, 1);
      } else {
        assert.fail('Filters set has not been initialized for onBeforeRequest');
      }
    });
  });

  describe('Adding', () => {
    it('adds a listener under the correct method type', () => {
      const webRq = new BetterWebRequest(mockedWebRequest);
      webRq.addListener('onBeforeRequest', { urls: ['test.url'] }, () => {}, { origin: 'TEST' });
      const actual = webRq.getListenersFor('onBeforeRequest');

      if (actual) {
        const createdListener = Array.from(actual.values())[0];
        assert.equal(actual.size, 1);
        assert.equal(createdListener.context.origin, 'TEST');
      } else {
        assert.fail('No map (listeners) has been initialized for onBeforeRequest');
      }
    });

    it('updates the global method filter with ONE listener', () => {
      const webRq = new BetterWebRequest(mockedWebRequest);
      webRq.addListener('onBeforeRequest', { urls: ['foo.url'] }, () => {}, { origin: 'FOO' });
      const actual = webRq.getFiltersFor('onBeforeRequest');

      if (actual) {
        assert.equal(actual.size, 1);
        assert.ok(actual.has('foo.url'));
      } else {
        assert.fail('No set (filters) has been initialized for onBeforeRequest');
      }
    });

    it('stacks multiple listeners under the correct method type', () => {
      const webRq = new BetterWebRequest(mockedWebRequest);
      webRq.addListener('onBeforeRequest', { urls: ['foo.url'] }, () => {}, { origin: 'FOO' });
      webRq.addListener('onBeforeRequest', { urls: ['bar.url'] }, () => {}, { origin: 'BAR' });
      const actual = webRq.getListenersFor('onBeforeRequest');

      if (actual) {
        const fooListener = Array.from(actual.values())[0];
        const barListener = Array.from(actual.values())[1];

        assert.equal(actual.size, 2);
        assert.equal(fooListener.context.origin, 'FOO');
        assert.equal(barListener.context.origin, 'BAR');
      } else {
        assert.fail('No map (listeners) has been initialized for onBeforeRequest');
      }
    });

    it('updates the global method filter with MULTIPLE listeners', () => {
      const webRq = new BetterWebRequest(mockedWebRequest);
      webRq.addListener('onBeforeRequest', { urls: ['foo.url'] }, () => {}, { origin: 'FOO' });
      webRq.addListener('onBeforeRequest', { urls: ['bar.url'] }, () => {}, { origin: 'BAR' });
      const actual = webRq.getFiltersFor('onBeforeRequest');

      if (actual) {
        assert.equal(actual.size, 2);
        assert.ok(actual.has('foo.url'));
        assert.ok(actual.has('bar.url'));
      }
    });

    it('assigns an order to each added listeners', () => {
      const webRq = new BetterWebRequest(mockedWebRequest);
      webRq.addListener('onBeforeRequest', { urls: ['foo.url'] }, () => {}, { origin: 'FOO' });
      webRq.addListener('onBeforeRequest', { urls: ['bar.url'] }, () => {}, { origin: 'BAR' });
      const actual = webRq.getListenersFor('onBeforeRequest');

      if (actual) {
        const fooListener = Array.from(actual.values())[0];
        const barListener = Array.from(actual.values())[1];
        assert.equal(fooListener.context.order, 1);
        assert.equal(barListener.context.order, 2);
      }
    });
  });

  describe('Removing', () => {
    let webRq: BetterWebRequest;
    let listener: IListener;

    beforeEach(() => {
      webRq = new BetterWebRequest(mockedWebRequest);
      listener = webRq.addListener('onBeforeRequest', { urls: ['foo.url'] }, () => {}, { origin: 'FOO' });
      webRq.addListener('onBeforeRequest', { urls: ['baz.url'] }, () => {}, { origin: 'BAZ' });
      webRq.addListener('onBeforeSendHeaders', { urls: ['bar.url'] }, () => {}, { origin: 'BAR' });

    });

    it('removes one listerner from a method type', () => {
      const globalListeners = webRq.getListeners();
      const methodListeners = webRq.getListenersFor('onBeforeRequest');

      if (globalListeners && methodListeners) {
        assert.equal(globalListeners.size, 2);
        assert.equal(methodListeners.size, 2);

        webRq.removeListener('onBeforeRequest', listener.id);

        assert.equal(globalListeners.size, 2);
        assert.equal(methodListeners.size, 1);
      }
      // todo : Check if the one that is left is the correct one
    });

    it('removes the listener pattern from the global filters with the listener itself', () => {
      const globalFilters = webRq.getFilters();
      const beforeFilters = webRq.getFiltersFor('onBeforeRequest');

      if (globalFilters && beforeFilters) {
        // Before
        assert.equal(globalFilters.size, 2);
        assert.equal(beforeFilters.size, 2);
        assert.ok(beforeFilters.has('foo.url'));
        assert.ok(beforeFilters.has('baz.url'));

        webRq.removeListener('onBeforeRequest', listener.id);

        // After
        const afterFilters = webRq.getFiltersFor('onBeforeRequest');
        if (afterFilters) {
          assert.equal(globalFilters.size, 2);
          assert.equal(afterFilters.size, 1);
          assert.ok(afterFilters.has('baz.url'));
        } else {
          assert.fail('Map filters was destroyed');
        }
      } else {
        assert.fail('Map filters was not initialized');
      }
    });

    it('handle the listener not existing in the map', () => {
      const globalListeners = webRq.getListeners();
      const methodListeners = webRq.getListenersFor('onBeforeRequest');

      if (globalListeners && methodListeners) {
        // Before
        assert.equal(globalListeners.size, 2);
        assert.equal(methodListeners.size, 2);

        webRq.removeListener('onBeforeRequest', 'aaabbbzzzzxxxxxx');

        // After
        assert.equal(globalListeners.size, 2);
        assert.equal(methodListeners.size, 2);
      } else {
        assert.fail('Map listeners was not initialized');
      }
    });
  });
});
