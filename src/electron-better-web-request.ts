import match from 'match-chrome';
import uuid from 'uuid/v4';

import {
  IBetterWebRequest,
  WebRequestMethod,
  URLPattern,
  IFilter,
  IListener,
  IContext,
  IApplier,
  IListenerCollection,
} from './types';

const defaultResolver = (listeners: IApplier[]) => {
  const sortedListeners = listeners.sort((a, b) => b.context.order - a.context.order);
  const lastListener = sortedListeners[0];
  return lastListener.applier();
};

export default class BetterWebRequest implements IBetterWebRequest {
  private static instance: BetterWebRequest;

  private webRequest: any;

  private orderIndex: number;
  private listeners: Map<WebRequestMethod, IListenerCollection>;
  private filters: Map<WebRequestMethod, Set<URLPattern>>;
  private resolvers: Map<WebRequestMethod, Function>;

  constructor(webRequest: any) {
    if (BetterWebRequest.instance) {
      return BetterWebRequest.instance;
    }

    this.orderIndex = 0;
    this.webRequest = webRequest;
    this.listeners = new Map();
    this.filters = new Map();
    this.resolvers = new Map();
  }

  public static reset() {
    if (BetterWebRequest.instance) delete BetterWebRequest.instance;
  }

  private get nextIndex() {
    return this.orderIndex += 1;
  }

  getListeners() {
    return this.listeners;
  }

  getListenersFor(method: WebRequestMethod) {
    return this.listeners.get(method);
  }

  getFilters() {
    return this.filters;
  }

  getFiltersFor(method: WebRequestMethod) {
    return this.filters.get(method);
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

  // Alias for drop in replacement
  onBeforeRequest(filter: IFilter, action: Function, options: Partial<IContext> = {})
  { return this.addListener('onBeforeRequest', filter, action, options); }
  onBeforeSendHeaders(filter: IFilter, action: Function, options: Partial<IContext> = {})
  { return this.addListener('onBeforeSendHeaders', filter, action, options); }
  onHeadersReceived(filter: IFilter, action: Function, options: Partial<IContext> = {})
  { return this.addListener('onHeadersReceived', filter, action, options); }
  onSendHeaders(filter: IFilter, action: Function, options: Partial<IContext> = {})
  { return this.addListener('onSendHeaders', filter, action, options); }
  onResponseStarted(filter: IFilter, action: Function, options: Partial<IContext> = {})
  { return this.addListener('onResponseStarted', filter, action, options); }
  onBeforeRedirect(filter: IFilter, action: Function, options: Partial<IContext> = {})
  { return this.addListener('onBeforeRedirect', filter, action, options); }
  onCompleted(filter: IFilter, action: Function, options: Partial<IContext> = {})
  { return this.addListener('onCompleted', filter, action, options); }
  onErrorOccurred(filter: IFilter, action: Function, options: Partial<IContext> = {})
  { return this.addListener('onErrorOccurred', filter, action, options); }

  addListener(method: WebRequestMethod, filter: IFilter, action: Function, outerContext: Partial<IContext> = {}) {
    const { urls } = filter;
    const id = uuid();
    const innerContext = { order: this.nextIndex };
    const context = { ...outerContext, ...innerContext };
    const listener = {
      id,
      urls,
      action,
      context,
    };

    if (!this.listeners.has(method)) {
      this.listeners.set(method, new Map());
    }
    // @ts-ignore
    this.listeners.get(method).set(id, listener);

    if (!this.filters.has(method)) {
      this.filters.set(method, new Set());
    }
    const currentFilters = this.filters.get(method);
    for (const url of urls) {
      // @ts-ignore
      currentFilters.add(url);
    }
    // @ts-ignore // Remake the new hook
    this.webRequest[method]([...currentFilters], this.listenerFactory.bind(this));

    return listener;
  }

  removeListener(method: WebRequestMethod, id: IListener['id']) {
    const listeners = this.listeners.get(method);
    if (listeners) {
      listeners.delete(id);
      const newFilters = this.mergeFilters(listeners);
      this.filters.set(method, newFilters);

      // Rebind the new hook
      this.webRequest[method]([...newFilters], this.listenerFactory.bind(this));
    }
  }

  setConflictResolver(method: WebRequestMethod, resolver: Function) {
    if (this.hasCallback(method)) {
      if (this.resolvers.has(method)) {
        // todo : update this as real logger thingy ?
        console.warn('Overriding resolver on ', method);
      }
      this.resolvers.set(method, resolver);
    } else {
      console.warn(`Method ${method} has no callback and does not use a resolver`);
    }
  }

  /**
   * Find a subset of listeners that match a given url
   */
  matchListeners(url: string, listeners: IListenerCollection): IListener[] {
    const arrayListeners = Array.from(listeners.values());
    const subset = arrayListeners.filter(element => {
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
  private async listenerFactory(details: any, callback?: Function) {
    // todo : Check that we have access to the method in details, if not : remake a factory
    const method = details.method;
    if (!this.listeners.has(method)) {
      this.webRequest[method](null);
      return;
    }

    const listeners = this.listeners.get(method);
    // @ts-ignore
    const matchedListeners = this.matchListeners(details.url, listeners);
    if (matchedListeners.length === 0) {
      return;
    }

    let resolve = this.resolvers.get(method);
    if (!resolve) resolve = defaultResolver;
    const requestsProcesses = this.processRequests(details, matchedListeners);

    if (this.hasCallback(method) && callback) {
      const modified = await resolve(requestsProcesses);
      callback(modified);
    } else {
      requestsProcesses.map(listener => listener.applier());
    }
  }

  /**
   * Create all the executions of listeners on the web request (indenpendently)
   * Wrap them so they can be triggered only when needed
   */
  private processRequests(details: any, requestListeners: IListener[]): IApplier[] {
    const appliers = [];
    for (const listener of requestListeners) {
      const applier = this.applyListener(details, listener.action);
      const executor = {
        applier,
        context: listener.context,
      };
      appliers.push(executor);
    }

    return appliers;
  }

  /**
   * Factory : make a function that will return a Promise wrapping the execution of the listener
   * Allow to trigger the application only when needed + promisify the execution of this listener
   */
  private applyListener(details: any, listener: Function): Function {
    return () => new Promise((resolve, reject) => {
      try {
        listener(details, resolve);
      } catch (err) {
        reject(err);
      }
    });
  }

  private mergeFilters(listeners: IListenerCollection) {
    const arrayListeners = Array.from(listeners.values());
    const filters = arrayListeners.reduce((accumulator, value) => {
      for (const url of value.urls) accumulator.add(url);
      return accumulator;
    }, new Set());

    return filters;
  }
}
