import match from 'url-match-patterns';
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
  const sorted = listeners.sort((a, b) => b.context.order - a.context.order);
  const last = sorted[0];
  return last.apply();
};

export default class BetterWebRequest implements IBetterWebRequest {
  private webRequest: any;

  private orderIndex: number;
  private listeners: Map<WebRequestMethod, IListenerCollection>;
  private filters: Map<WebRequestMethod, Set<URLPattern>>;
  private resolvers: Map<WebRequestMethod, Function>;

  constructor(webRequest: any) {
    this.orderIndex = 0;
    this.webRequest = webRequest;
    this.listeners = new Map();
    this.filters = new Map();
    this.resolvers = new Map();
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
  onBeforeRequest(...parameters: any) {
    const method = 'onBeforeRequest';
    const args = this.parseArguments(parameters);
    return this.identifyAction(method, args);
  }

  onBeforeSendHeaders(...parameters: any) {
    const method = 'onBeforeSendHeaders';
    const args = this.parseArguments(parameters);
    return this.identifyAction(method, args);
  }

  onHeadersReceived(...parameters: any) {
    const method = 'onHeadersReceived';
    const args = this.parseArguments(parameters);
    return this.identifyAction(method, args);
  }

  onSendHeaders(...parameters: any) {
    const method = 'onSendHeaders';
    const args = this.parseArguments(parameters);
    return this.identifyAction(method, args);
  }

  onResponseStarted(...parameters: any) {
    const method = 'onResponseStarted';
    const args = this.parseArguments(parameters);
    return this.identifyAction(method, args);
  }

  onBeforeRedirect(...parameters: any) {
    const method = 'onBeforeRedirect';
    const args = this.parseArguments(parameters);
    return this.identifyAction(method, args);
  }

  onCompleted(...parameters: any) {
    const method = 'onCompleted';
    const args = this.parseArguments(parameters);
    return this.identifyAction(method, args);
  }

  onErrorOccurred(...parameters: any) {
    const method = 'onErrorOccurred';
    const args = this.parseArguments(parameters);
    return this.identifyAction(method, args);
  }

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
    const listeners = this.listeners.get(method);
    if (!listeners) throw new Error('Listeners Map has not been properly initialized');
    listeners.set(id, listener);

    if (!this.filters.has(method)) {
      this.filters.set(method, new Set());
    }
    const currentFilters = this.filters.get(method);
    if (!currentFilters) throw new Error('Filters Set has not been properly initialized');
    for (const url of urls) {
      currentFilters.add(url);
    }

    // Remake the new hook
    this.webRequest[method]({ urls: [...currentFilters] }, this.listenerFactory(method));

    return listener;
  }

  removeListener(method: WebRequestMethod, id: IListener['id']) {
    const listeners = this.listeners.get(method);
    if (!listeners || !listeners.has(id)) {
      return;
    }

    if (listeners.size === 1) {
      this.clearListeners(method);
    } else {
      listeners.delete(id);
      const newFilters = this.mergeFilters(listeners);
      this.filters.set(method, newFilters);

      // Rebind the new hook
      this.webRequest[method]([...newFilters], this.listenerFactory(method));
    }
  }

  clearListeners(method: WebRequestMethod) {
    const listeners = this.listeners.get(method);
    const filters = this.filters.get(method);

    if (listeners) listeners.clear();
    if (filters) filters.clear();

    this.webRequest[method](null);
  }

  setResolver(method: WebRequestMethod, resolver: Function) {
    if (this.hasCallback(method)) {
      if (this.resolvers.has(method)) {
        console.warn('Overriding resolver on ', method);
      }
      this.resolvers.set(method, resolver);
    } else {
      console.warn(`Method ${method} has no callback and does not use a resolver`);
    }
  }

  // Find a subset of listeners that match a given url
  matchListeners(url: string, listeners: IListenerCollection): IListener[] {
    const arrayListeners = Array.from(listeners.values());
    const subset = arrayListeners.filter(element => {
      for (const pattern of element.urls) {
        if (match(pattern, url)) return true;
      }
      return false;
    });
    return subset;
  }

  // Workflow triggered when a web request arrive
  // Use the original listener signature needed by electron.webrequest.onXXXX()
  private listenerFactory(method: WebRequestMethod) {
    return async (details: any, callback?: Function) => {
      if (!this.listeners.has(method)) {
        this.webRequest[method](null);
        return;
      }

      const listeners = this.listeners.get(method);
      if (!listeners) {
        if (callback) callback({ cancel : false });
        return;
      }

      const matchedListeners = this.matchListeners(details.url, listeners);
      if (matchedListeners.length === 0) {
        if (callback) callback({ cancel: false });
        return;
      }

      let resolve = this.resolvers.get(method);
      if (!resolve) resolve = defaultResolver;
      const requestsProcesses = this.processRequests(details, matchedListeners);

      if (this.hasCallback(method) && callback) {
        const modified = await resolve(requestsProcesses);
        callback(modified);
      } else {
        requestsProcesses.map(listener => listener.apply());
      }
    };
  }

  // Create all the executions of listeners on the web request (independently)
  // Wrap them so they can be triggered only when needed
  private processRequests(details: any, requestListeners: IListener[]): IApplier[] {
    const appliers: IApplier[] = [];
    for (const listener of requestListeners) {
      const apply = this.makeApplier(details, listener.action);
      const executor = {
        apply,
        context: listener.context,
      };
      appliers.push(executor);
    }

    return appliers;
  }

  // Factory : make a function that will return a Promise wrapping the execution of the listener
  // Allow to trigger the application only when needed + promisify the execution of this listener
  private makeApplier(details: any, listener: Function): Function {
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

  private identifyAction(method: WebRequestMethod, args: any) {
    return (args.unbind)
    ? this.clearListeners(method)
    : this.addListener(method, args.filter, args.action, args.options);
  }

  private parseArguments(parameters: any): object {
    const args = {
      unbind: false,
      filter: { urls: ['<all_urls>'] },
      action: null,
      options: {},
    };

    switch (parameters.length) {
      case 0 :
        args.unbind = true;
        break;

      case 1 :
        if (typeof parameters[0] === 'function') {
          args.action = parameters[0];
          break;
        }

        throw new Error('Wrong function signature : No function listener given');

      case 2 :
        if (typeof parameters[0] === 'object' && typeof parameters[1] === 'function') {
          args.filter = parameters[0];
          args.action = parameters[1];
          break;
        }

        if (typeof parameters[0] === 'function') {
          args.action = parameters[0];
          args.options = parameters[1];
          break;
        }

        throw new Error('Wrong function signature : argument 1 should be an object filters or the function listener');

      case 3 :
        if (typeof parameters[0] === 'object' && typeof parameters[1] === 'function') {
          args.filter = parameters[0];
          args.action = parameters[1];
          args.options = parameters[3];
          break;
        }

        throw new Error('Wrong function signature : should be arg 1 -> filter object, arg 2 -> function listener, arg 3 -> options');

      default :
        throw new Error('Wrong function signature : Too many arguments');
    }

    return args;
  }
}
