import match from 'match-chrome';

import {
  IBetterWebRequest,
  WebRequestMethod,
  IFilter,
  IListener,
  IListenerOptions,
} from './types';

// todo : create a default resolver according specs
const defaultResolver = () => {

};

export default class BetterWebRequest implements IBetterWebRequest {
  private static instance: BetterWebRequest;

  private webRequest: any;

  private listeners: Map<string, Set<IListener>>;
  // todo : use a weak set instead of an array
  private filters: Map<string, string[]>;
  private resolvers: Map<string, Function>;

  constructor(webRequest: any) {
    if (BetterWebRequest.instance) {
      return BetterWebRequest.instance;
    }

    this.webRequest = webRequest;
    this.listeners = new Map();
    this.filters = new Map();
    this.resolvers = new Map();
  }

  public static reset() {
    if (BetterWebRequest.instance) delete BetterWebRequest.instance;
  }

  // Alias for drop in replacement
  onBeforeRequest(filter: IFilter, action: Function, options: Partial<IListenerOptions> = {})
  { this.addListener('onBeforeRequest', filter, action, options); }
  onBeforeSendHeaders(filter: IFilter, action: Function, options: Partial<IListenerOptions> = {})
  { this.addListener('onBeforeSendHeaders', filter, action, options); }
  onHeadersReceived(filter: IFilter, action: Function, options: Partial<IListenerOptions> = {})
  { this.addListener('onHeadersReceived', filter, action, options); }
  onSendHeaders(filter: IFilter, action: Function, options: Partial<IListenerOptions> = {})
  { this.addListener('onSendHeaders', filter, action, options); }
  onResponseStarted(filter: IFilter, action: Function, options: Partial<IListenerOptions> = {})
  { this.addListener('onResponseStarted', filter, action, options); }
  onBeforeRedirect(filter: IFilter, action: Function, options: Partial<IListenerOptions> = {})
  { this.addListener('onBeforeRedirect', filter, action, options); }
  onCompleted(filter: IFilter, action: Function, options: Partial<IListenerOptions> = {})
  { this.addListener('onCompleted', filter, action, options); }
  onErrorOccurred(filter: IFilter, action: Function, options: Partial<IListenerOptions> = {})
  { this.addListener('onErrorOccurred', filter, action, options); }

  addListener(method: WebRequestMethod, filter: IFilter, action: Function, context: Partial<IListenerOptions> = {}) {
    const { urls } = filter;
    const listener = {
      urls,
      action,
      context,
    };

    // Track this new listener
    if (!this.listeners.has(method)) {
      this.listeners.set(method, new Set());
    }
    // @ts-ignore
    this.listeners.get(method).add(listener);

    // Compute the all inclusive filter
    const currentFilters = (this.filters.has(method)) ? this.filters.get(method) : [] ;
    // @ts-ignore
    const mergedFilters = [...currentFilters, ...urls];
    this.filters.set(method, mergedFilters);

    // Remake the new hook
    this.webRequest[method](mergedFilters, this.listenerFactory);
  }

  removeListener(method: WebRequestMethod, listener: IListener) {
    const listeners = this.listeners.get(method);
    if (listeners) {
      // Remove from the map
      listeners.delete(listener);
      // Remove url patterns from the global pattern by recreatting the whole list from scratch
      const newFilters = this.mergeFilters(listeners);
      this.filters.set(method, newFilters);
    }
  }

  getListeners(method: WebRequestMethod | undefined = undefined) {
    return (method) ? this.listeners.get(method) : this.listeners;
  }

  getFilters(method: WebRequestMethod | undefined = undefined) {
    return (method) ? this.filters.get(method) : this.filters;
  }

  hasCallback(method: WebRequestMethod): boolean {
    switch (method) {
      case 'onBeforeRequest':
      case 'onBeforeSendHeaders':
      case 'onHeadersReceived':
        return true;
      default:
        return false;
    }
  }

  setConflictResolver(method: WebRequestMethod, resolver: Function) {
    if (this.resolvers.has(method)) {
      // todo : update this as real logger thingy ?
      console.warn('Overriding resolver on ', method);
    }
    this.resolvers.set(method, resolver);
  }

  /**
   * Find a subset of listeners that match with a given url
   */
  matchListeners(url: string, listeners: IListener[]): IListener[] {
    const subset = listeners.filter(element => {
      for (const pattern of element.urls) {
        if (match(url, pattern)) return true;
      }
      return false;
    });

    return subset;
  }

  /**
   * Workflow triggered when a web request arrive
   * Use the original listener signature needed by electron.webrequest.onXXXX()
   */
  private listenerFactory(details: any, callback: Function) {
    // todo : Check that we have access to the method in details, if not : remake a factory
    const method = details.method;
    if (!this.listeners.has(method)) {
      throw new Error(`No listeners for the requested method ${method}`);
    }
    const listeners = this.listeners.get(method);
    // @ts-ignore
    const matchedListeners = this.matchListeners(details.url, listeners);

    let resolve = this.resolvers.get(method);
    if (!resolve) resolve = defaultResolver;

    const requestsProcesses = this.processRequests(details, matchedListeners);
    const modified = resolve(requestsProcesses);

    callback(modified);
  }

  /**
   * Create all the executions of listeners on the web request (indenpendently)
   * Wrap them so they can be triggered only when needed
   */
  private processRequests(details: any, requestListeners: any[]): object[] {
    const prepared = [];

    for (const listener of requestListeners) {
      const applier = this.applyListener(details, listener.action);
      const executor = {
        applier,
        context: listener.context,
      };
      prepared.push(executor);
    }

    return prepared;
  }

  /**
   * Factory : make a function that will return a Promise wrapping the execution of the listener
   * Allow to trigger the application only when needed + promisify the execution of this listener
   */
  private applyListener(details: any, listener: Function): Function {
    return () => {
      new Promise((resolve, reject) => {
        try {
          listener(details, resolve);
        } catch (err) {
          reject(err);
        }
      });
    };
  }

  private mergeFilters(listeners: Set<IListener>) {
    const filters = Array.from(listeners).reduce(
      (accumulator, value) => [...accumulator, ...value.urls],
      []
    );

    return filters;
  }
}
