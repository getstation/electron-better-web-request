import assert from 'assert';

import BetterWebRequest from '../src/electron-better-web-request';
import {
  IListener,
} from '../src/types';

const mockedWebRequest = {
  onBeforeRequest: () => {},
  onBeforeSendHeaders: () => {},
};

describe('Listeners & Filters Manipulation', () => {
  describe('Getting', () => {
    BetterWebRequest.reset();
    const webRq = new BetterWebRequest(mockedWebRequest);
    webRq.addListener('onBeforeRequest', { urls: ['foo.url'] }, () => {}, { origin: 'FOO' });
    webRq.addListener('onBeforeSendHeaders', { urls: ['bar.url'] }, () => {}, { origin: 'BAR' });

    it('returns all the listeners when no argument given', () => {
      const actual = webRq.getListeners();
      if (actual) {
        assert.equal(actual.size, 2);
        // @ts-ignore
        assert.equal(actual.get('onBeforeRequest').size, 1);
        // @ts-ignore
        assert.equal(actual.get('onBeforeSendHeaders').size, 1);
      } else {
        assert.fail('Map listeners was not initialized');
      }
    });

    it('returns the method listeners when method type is specified', () => {
      const actual = webRq.getListeners('onBeforeRequest');
      assert.ok(actual);
      // @ts-ignore
      assert.equal(actual.size, 1);
    });

    it('returns all the filters when no argument given', () => {
      const actual = webRq.getFilters();
      assert.ok(actual);
      // @ts-ignore
      assert.equal(actual.size, 2);
      // @ts-ignore
      assert.equal(actual.get('onBeforeRequest').length, 1);
      // @ts-ignore
      assert.equal(actual.get('onBeforeSendHeaders').length, 1);
    });

    it('returns the method filters when method type is specified', () => {
      const actual = webRq.getFilters('onBeforeRequest');
      assert.ok(actual);
      // @ts-ignore
      assert.equal(actual.length, 1);
    });
  });

  describe('Adding', () => {
    beforeEach(() => {
      BetterWebRequest.reset();
    });

    it('adds a listener under the correct method type', () => {
      const webRq = new BetterWebRequest(mockedWebRequest);
      webRq.addListener('onBeforeRequest', { urls: ['test.url'] }, () => {}, { origin: 'TEST' });
      const actual = webRq.getListeners('onBeforeRequest');
      // @ts-ignore
      const createdListener = Array.from(actual.values())[0];

      assert.ok(actual);
      // @ts-ignore
      assert.equal(actual.size, 1);
      assert.equal(createdListener.context.origin, 'TEST');
    });

    it('updates the global method filter with ONE listener', () => {
      const webRq = new BetterWebRequest(mockedWebRequest);
      webRq.addListener('onBeforeRequest', { urls: ['foo.url'] }, () => {}, { origin: 'FOO' });
      const actual = webRq.getFilters('onBeforeRequest');

      assert.ok(actual);
      // @ts-ignore
      assert.equal(actual.length, 1);
      // @ts-ignore
      assert.equal(actual[0], 'foo.url');
    });

    it('stacks multiple listeners under the correct method type', () => {
      const webRq = new BetterWebRequest(mockedWebRequest);
      webRq.addListener('onBeforeRequest', { urls: ['foo.url'] }, () => {}, { origin: 'FOO' });
      webRq.addListener('onBeforeRequest', { urls: ['bar.url'] }, () => {}, { origin: 'BAR' });
      const actual = webRq.getListeners('onBeforeRequest');
      // @ts-ignore
      const fooListener = Array.from(actual.values())[0];
      // @ts-ignore
      const barListener = Array.from(actual.values())[1];

      assert.ok(actual);
      // @ts-ignore
      assert.equal(actual.size, 2);
      assert.equal(fooListener.context.origin, 'FOO');
      assert.equal(barListener.context.origin, 'BAR');
    });

    it('updates the global method filter with MULTIPLE listeners', () => {
      const webRq = new BetterWebRequest(mockedWebRequest);
      webRq.addListener('onBeforeRequest', { urls: ['foo.url'] }, () => {}, { origin: 'FOO' });
      webRq.addListener('onBeforeRequest', { urls: ['bar.url'] }, () => {}, { origin: 'BAR' });
      const actual = webRq.getFilters('onBeforeRequest');

      assert.ok(actual);
      // @ts-ignore
      assert.equal(actual.length, 2);
      // @ts-ignore
      assert.equal(actual[0], 'foo.url');
      // @ts-ignore
      assert.equal(actual[1], 'bar.url');
    });
  });

  describe('Removing', () => {
    let webRq: BetterWebRequest;
    let listener: IListener;
    let globalListeners: Map<string, Set<IListener>>;
    let methodListeners: Map<string, string[]>;

    beforeEach(() => {
      BetterWebRequest.reset();
      webRq = new BetterWebRequest(mockedWebRequest);
      listener = webRq.addListener('onBeforeRequest', { urls: ['foo.url'] }, () => {}, { origin: 'FOO' });
      webRq.addListener('onBeforeRequest', { urls: ['baz.url'] }, () => {}, { origin: 'BAZ' });
      webRq.addListener('onBeforeSendHeaders', { urls: ['bar.url'] }, () => {}, { origin: 'BAR' });
      // @ts-ignore
      globalListeners = webRq.getListeners();
      // @ts-ignore
      methodListeners = webRq.getListeners('onBeforeRequest');
    });

    it('removes one listerner from a method type', () => {
      assert.equal(globalListeners.size, 2);
      assert.equal(methodListeners.size, 2);

      webRq.removeListener('onBeforeRequest', listener.id);

      assert.equal(globalListeners.size, 2);
      assert.equal(methodListeners.size, 1);
      // todo : Check if the one that is left is the correct one
    });

    it('removes the listener pattern from the global filters with the listener itself', () => {
      const globalFilters = webRq.getFilters();
      const beforeFilters = webRq.getFilters('onBeforeRequest');

      if (globalFilters && beforeFilters) {
        // Before
        // @ts-ignore
        assert.equal(globalFilters.size, 2);
        // @ts-ignore
        assert.equal(beforeFilters.length, 2);
        assert.equal(beforeFilters[0], 'foo.url');
        assert.equal(beforeFilters[1], 'baz.url');

        webRq.removeListener('onBeforeRequest', listener.id);

        // After
        const afterFilters = webRq.getFilters('onBeforeRequest');
        if (afterFilters) {
          // @ts-ignore
          assert.equal(globalFilters.size, 2);
          // @ts-ignore
          assert.equal(afterFilters.length, 1);
          assert.equal(afterFilters[0], 'baz.url');
        } else {
          assert.fail('Map filters was destroyed');
        }
      } else {
        assert.fail('Map filters was not initialized');
      }
    });

    it('handle the listener not existing in the map', () => {
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
