import {
  IBetterWebRequest,
  WebRequestMethods,
  IFilter,
  IListener,
  IListenerOptions,
  Response,
} from './types';

const defaultResolver = () => {

};

export default class BetterWebRequest implements IBetterWebRequest {
  private instance: BetterWebRequest;
  private webRequest: any;
  private listeners: Map<string, Set<IListener>>;
  private filters: Map<string, string[]>;
  private resolvers: Map<string, Function>;

  constructor(webRequest: any) {
    if (this.instance) {
      return this.instance;
    }

    this.webRequest = webRequest;
    this.listeners = new Map();
    this.filters = new Map();
    this.resolvers = new Map();
  }

  hasCallback(method: WebRequestMethods): boolean {
    switch (method) {
      case 'onBeforeRequest':
      case 'onBeforeSendHeaders':
      case 'onHeadersReceived':
        return true;
      default:
        return false;
    }
  }

  setConflictResolver(requestType: WebRequestMethods, resolver: Function) {
    if (this.resolvers.has(requestType)) {
      // todo : kill this, it's just for testing purpose
      console.warn('Overriding resolver on ', requestType);
    }
    this.resolvers.set(requestType, resolver);
  }

  onBeforeRequest(filter: IFilter, action: Function, options: Partial<IListenerOptions> = {})
  { this.registerListener('onBeforeRequest', filter, action); }
  onBeforeSendHeaders(filter: IFilter, action: Function, options: Partial<IListenerOptions> = {})
  { this.registerListener('onBeforeSendHeaders', filter, action); }
  onHeadersReceived(filter: IFilter, action: Function, options: Partial<IListenerOptions> = {})
  { this.registerListener('onHeadersReceived', filter, action); }
  onSendHeaders(filter: IFilter, action: Function, options: Partial<IListenerOptions> = {})
  { this.registerListener('onSendHeaders', filter, action); }
  onResponseStarted(filter: IFilter, action: Function, options: Partial<IListenerOptions> = {})
  { this.registerListener('onResponseStarted', filter, action); }
  onBeforeRedirect(filter: IFilter, action: Function, options: Partial<IListenerOptions> = {})
  { this.registerListener('onBeforeRedirect', filter, action); }
  onCompleted(filter: IFilter, action: Function, options: Partial<IListenerOptions> = {})
  { this.registerListener('onCompleted', filter, action); }
  onErrorOccurred(filter: IFilter, action: Function, options: Partial<IListenerOptions> = {})
  { this.registerListener('onErrorOccurred', filter, action); }

  removeListener(requestType: WebRequestMethods, listener: IListener) {
    const listeners = this.listeners.get(requestType);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  private registerListener(requestType: WebRequestMethods, filter: IFilter, action: Function, options: Partial<IListenerOptions> = {}) {
    const { urls } = filter;
    const listener = {
      urls,
      action,
      options,
    };

    // Track this new listener
    if (!this.listeners.has(requestType)) {
      this.listeners.set(requestType, new Set());
    }
    this.listeners.get(requestType).add(listener);

    // Compute the all inclusive filter
    const currentFilters = (this.filters.has(requestType)) ? this.filters.get(requestType) : [] ;
    const mergedFilters = [...currentFilters, ...urls];
    this.filters.set(requestType, mergedFilters);

    // Remake the new hook
    this.webRequest[requestType](mergedFilters, this.webRequestHook(requestType));
  }

  private webRequestHook(requestType: WebRequestMethods) {
    return (details: any, callback: Function) => {
      const matchedListeners = this.matchListeners(details, this.listeners.get(requestType));
      let resolve = this.resolvers.get(requestType);

      if (!resolve) resolve = defaultResolver;
      const queue = resolve(matchedListeners);
      const modified = this.applyPipeline(details, queue);

      if (modified.cancel) {
        callback({ cancel: true });
      } else {
        callback(modified);
      }
    };
  }

  private matchListeners(details: any, listeners: Set<IListener>) {
    console.log('Hello');
  }

  private applyPipeline(details, queue): Partial<Response> {
    return { cancel: false };
  }
}
