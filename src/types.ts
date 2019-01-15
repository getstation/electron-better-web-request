type WebRequestWithCallback =
  'onBeforeRequest' |
  'onBeforeSendHeaders' |
  'onHeadersReceived';

type WebRequestWithoutCallback =
  'onSendHeaders' |
  'onResponseStarted' |
  'onBeforeRedirect' |
  'onCompleted' |
  'onErrorOccurred';

export type WebRequestMethod = WebRequestWithCallback | WebRequestWithoutCallback;
export type URLPattern = string;

export interface IFilter {
  urls: string[],
}

export interface IListener {
  id: string,
  urls: string[],
  action: Function,
  context: IContext,
}

export interface IContext {
  priority?: number,
  origin?: string,
  order: number,
}

export interface IApplier {
  applier: Function,
  context: IContext,
}

export type IListenerCollection = Map<IListener['id'], IListener>;

export interface IBetterWebRequest {
  onBeforeRequest(filter: IFilter, action: Function, options: Partial<IContext>): IListener | void;
  onBeforeSendHeaders(filter: IFilter, action: Function, options: Partial<IContext>): IListener | void;
  onHeadersReceived(filter: IFilter, action: Function, options: Partial<IContext>): IListener | void;
  onSendHeaders(filter: IFilter, action: Function, options: Partial<IContext>): IListener | void;
  onResponseStarted(filter: IFilter, action: Function, options: Partial<IContext>): IListener | void;
  onBeforeRedirect(filter: IFilter, action: Function, options: Partial<IContext>): IListener | void;
  onCompleted(filter: IFilter, action: Function, options: Partial<IContext>): IListener | void;
  onErrorOccurred(filter: IFilter, action: Function, options: Partial<IContext>): IListener | void;

  addListener(method: WebRequestMethod, filter: IFilter, action: Function, context: Partial<IContext>): IListener;
  removeListener(method: WebRequestMethod, id: IListener['id']): void;
  removeListeners(method: WebRequestMethod): void;
  setConflictResolver(requestMethod: WebRequestMethod, resolver: Function): void;
  matchListeners(url: string, listeners: IListenerCollection): IListener[];

  getListeners(): Map<WebRequestMethod, IListenerCollection>;
  getListenersFor(method: WebRequestMethod): IListenerCollection | undefined;
  getFilters(): Map<WebRequestMethod, Set<URLPattern>>;
  getFiltersFor(method: WebRequestMethod): Set<URLPattern> | undefined;
  hasCallback(method: WebRequestMethod): Boolean;
}
