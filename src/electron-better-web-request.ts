import { Session } from 'electron';
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
  IAliasParameters,
} from './types';

const defaultResolver = (listeners: IApplier[]) => {
  const sorted = listeners.sort((a, b) => b.context.order - a.context.order);
  const last = sorted[0];
  return last.apply();
};

const methodsWithCallback = [
  'onBeforeRequest',
  'onBeforeSendHeaders',
  'onHeadersReceived',
];

const aliasMethods = [
  'onBeforeRequest',
  'onBeforeSendHeaders',
  'onHeadersReceived',
  'onSendHeaders',
  'onResponseStarted',
  'onBeforeRedirect',
  'onCompleted',
  'onErrorOccurred',
];

export class BetterWebRequest implements IBetterWebRequest {
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
    return methodsWithCallback.includes(method);
  }

  // Handling alias for drop in replacement
  alias(method: WebRequestMethod, parameters: any) {
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

    // Add listener to method map
    if (!this.listeners.has(method)) {
      this.listeners.set(method, new Map());
    }

    this.listeners.get(method)!.set(id, listener);

    // Add filters to the method map
    if (!this.filters.has(method)) {
      this.filters.set(method, new Set());
    }

    const currentFilters = this.filters.get(method)!;
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
    if (!this.hasCallback(method)) {
      console.warn(`Event method "${method}" has no callback and does not use a resolver`);
      return;
    }

    if (this.resolvers.has(method)) {
      console.warn(`Overriding resolver on "${method}" method event`);
    }

    this.resolvers.set(method, resolver);
  }

  // Find a subset of listeners that match a given url
  matchListeners(url: string, listeners: IListenerCollection): IListener[] {
    const arrayListeners = Array.from(listeners.values());

    return arrayListeners.filter(
      element => element.urls.some(value => match(value, url))
    );
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
        if (callback) callback({ ...details, cancel: false });
        return;
      }

      const matchedListeners = this.matchListeners(details.url, listeners);

      if (matchedListeners.length === 0) {
        if (callback) callback({ ...details, cancel: false });
        return;
      }

      let resolve = this.resolvers.get(method);

      if (!resolve) {
        resolve = defaultResolver;
      }

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

      appliers.push({
        apply,
        context: listener.context,
      });
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

    return arrayListeners.reduce(
      (accumulator, value) => {
        for (const url of value.urls) accumulator.add(url);
        return accumulator;
      },
      new Set()
    );
  }

  private parseArguments(parameters: any): IAliasParameters {
    const args = {
      unbind: false,
      filter: { urls: ['<all_urls>'] },
      action: null,
      context: {},
    };

    switch (parameters.length) {
      case 0:
        args.unbind = true;
        break;

      case 1:
        if (typeof parameters[0] === 'function') {
          args.action = parameters[0];
          break;
        }

        throw new Error('Wrong function signature : No function listener given');

      case 2:
        if (typeof parameters[0] === 'object' && typeof parameters[1] === 'function') {
          args.filter = parameters[0];
          args.action = parameters[1];
          break;
        }

        if (typeof parameters[0] === 'function') {
          args.action = parameters[0];
          args.context = parameters[1];
          break;
        }

        throw new Error('Wrong function signature : argument 1 should be an object filters or the function listener');

      case 3:
        if (typeof parameters[0] === 'object' && typeof parameters[1] === 'function') {
          args.filter = parameters[0];
          args.action = parameters[1];
          args.context = parameters[2];
          break;
        }

        throw new Error('Wrong function signature : should be arg 1 -> filter object, arg 2 -> function listener, arg 3 -> context');

      default:
        throw new Error('Wrong function signature : Too many arguments');
    }

    return args;
  }

  private identifyAction(method: WebRequestMethod, args: IAliasParameters) {
    const { unbind, filter, action, context } = args;

    if (unbind) {
      return this.clearListeners(method);
    }

    if (!action) {
      throw new Error(`Cannot bind with ${method} : a listener is missing.`);
    }

    return this.addListener(method, filter, action, context);
  }
}

// Proxy handler that add support for all alias methods by redirecting to BetterWebRequest.alias()
const aliasHandler = {
  get: (target: BetterWebRequest, property: any) => {
    if (aliasMethods.includes(property)) {
      return (...parameters: any) => {
        target.alias(property, parameters);
      };
    }

    return target[property];
  },
};

export default (session: Session) => {
  return new Proxy(
    new BetterWebRequest(session.webRequest),
    aliasHandler
  );
};
