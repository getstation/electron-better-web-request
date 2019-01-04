import {
  IBetterWebRequest,
  WebRequestMethod,
  IFilter,
  IListener,
  IListenerOptions,
  Response,
} from './types';

const defaultResolver = () => {

};

export default class BetterWebRequest implements IBetterWebRequest {
  private static instance: BetterWebRequest;

  private webRequest: any;

  private listeners: Map<string, Set<IListener>>;
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

  addListener(requestMethod: WebRequestMethod, filter: IFilter, action: Function, context: Partial<IListenerOptions> = {}) {
    const { urls } = filter;
    const listener = {
      urls,
      action,
      context,
    };

    // Track this new listener
    if (!this.listeners.has(requestMethod)) {
      this.listeners.set(requestMethod, new Set());
    }
    // @ts-ignore
    this.listeners.get(requestMethod).add(listener);

    // Compute the all inclusive filter
    const currentFilters = (this.filters.has(requestMethod)) ? this.filters.get(requestMethod) : [] ;
    // @ts-ignore
    const mergedFilters = [...currentFilters, ...urls];
    this.filters.set(requestMethod, mergedFilters);

    // Remake the new hook
    this.webRequest[requestMethod](mergedFilters, this.listenerFactory(requestMethod));
  }

  // todo : update this, it doesn't work at all
  removeListener(requestMethod: WebRequestMethod, listener: IListener) {
    // Remove from the map
    const listeners = this.listeners.get(requestMethod);
    if (listeners) {
      listeners.delete(listener);
    }
    // Remove url patterns from the global pattern
  }

  getListeners(requestMethod: WebRequestMethod | undefined = undefined) {
    return (requestMethod) ? this.listeners.get(requestMethod) : this.listeners;
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

  setConflictResolver(requestMethod: WebRequestMethod, resolver: Function) {
    if (this.resolvers.has(requestMethod)) {
      // todo : update this as real logger thingy ?
      console.warn('Overriding resolver on ', requestMethod);
    }
    this.resolvers.set(requestMethod, resolver);
  }

  /**
   * Factory : Return a closure with the expected signature for electron.webrequest.onXXXX()
   * + requestMethod available
   */
  private listenerFactory(requestMethod: WebRequestMethod) {
    return (details: any, callback: Function) => {
      if (!this.listeners.has(requestMethod)) {
        throw new Error(`No listeners for the requested method ${requestMethod}`);
      }
      const listeners = this.listeners.get(requestMethod);
      // @ts-ignore
      const matchedListeners = this.matchListeners(details, listeners);

      let resolve = this.resolvers.get(requestMethod);
      if (!resolve) resolve = defaultResolver;

      const requestsProcesses = this.processRequests(details, matchedListeners);
      const modified = resolve(requestsProcesses);

      callback(modified);
    };
  }

  private matchListeners(details: any, listeners: Set<IListener>): IListener[] {
    // Match all url patterns with regexp
    console.log('Hello');
    return [];
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
}
