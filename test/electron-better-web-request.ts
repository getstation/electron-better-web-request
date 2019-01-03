import assert = require('assert');

describe('Electron Better Web Request', () => {
  describe('Lifecycle events', () => {
    it('has all lifecycles events', () => {

    });
  });

  describe('Register many listeners', () => {
    it('can add a listener', () => {
      assert.ok(true);
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

  describe('Resolve listeners queue', () => {
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
