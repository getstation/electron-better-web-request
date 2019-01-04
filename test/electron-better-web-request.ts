import assert = require('assert');
import BetterWebRequest from '../src/electron-better-web-request';

describe('Electron Better Web Request', () => {
  describe('Lifecycle events', () => {
    it('has all lifecycles events', () => {

    });
  });

  describe('Register many listeners', () => {
    // Pre / post conditions
    beforeEach(() => {

    });

    afterEach(() => {
      BetterWebRequest.reset();
    });

    // Mocked bersion of electron web request
    const mockedWebRequest = {
      onBeforeRedirect: () => {
        console.log('onBeforeRedirect has been called');
      },
    };

    // Actual tests
    it('can add a listener', () => {
      const betterWR = new BetterWebRequest(mockedWebRequest);
      const listeners = betterWR.getListeners();

      if (listeners) {
        assert.equal(listeners.size, 0);

        betterWR.addListener('onBeforeRedirect', { urls: [] }, () => {
          console.log('ceci est juste un test');
        });

        assert.equal(listeners.size, 1);
      } else {
        assert.fail('Electron Better Web Request has no map listeners initialised');
      }
    });

    it('keeps track of all added listeners', () => {

    });

    it('compiles all listeners url pattern into one global pattern to bind', () => {

    });

    it('sorts the concerned listeners for a given request', () => {

    });

    it('has merged all modifications in final request', () => {

    });

    it('cancels all when one is cancelled', () => {

    });
  });

  // todo : Update this part
  describe('Resolve listeners', () => {
    describe('Default resolver', () => {
      it('has a default resolver', () => {

      });

      it('sort according priority', () => {

      });

      it('use last registered when priority is the same', () => {

      });
    });

    describe('Custom resolver', () => {
      it('can use a custom resolver', () => {

      });

      it('throws an error if the resolver output is messed up', () => {

      });
    });
  });
});
