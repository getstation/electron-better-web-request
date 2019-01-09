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
  onBeforeRequest(filter: IFilter, action: Function, options: Partial<IContext>): IListener;
  onBeforeSendHeaders(filter: IFilter, action: Function, options: Partial<IContext>): IListener;
  onHeadersReceived(filter: IFilter, action: Function, options: Partial<IContext>): IListener;
  onSendHeaders(filter: IFilter, action: Function, options: Partial<IContext>): IListener;
  onResponseStarted(filter: IFilter, action: Function, options: Partial<IContext>): IListener;
  onBeforeRedirect(filter: IFilter, action: Function, options: Partial<IContext>): IListener;
  onCompleted(filter: IFilter, action: Function, options: Partial<IContext>): IListener;
  onErrorOccurred(filter: IFilter, action: Function, options: Partial<IContext>): IListener;

  addListener(method: WebRequestMethod, filter: IFilter, action: Function, context: Partial<IContext>): IListener;
  removeListener(method: WebRequestMethod, id: IListener['id']): void;
  setConflictResolver(requestMethod: WebRequestMethod, resolver: Function): void;

  getListeners(): Map<WebRequestMethod, IListenerCollection>;
  getListenersFor(method: WebRequestMethod): IListenerCollection | undefined;

  getFilters(): Map<WebRequestMethod, Set<URLPattern>>;
  getFiltersFor(method: WebRequestMethod): Set<URLPattern> | undefined;

  // getFilters<T extends WebRequestMethod | undefined = undefined>(method: T):
  //   T extends WebRequestMethod ? Set<URLPattern> | undefined : Map<WebRequestMethod, Set<URLPattern>>

  hasCallback(method: WebRequestMethod): Boolean;

  matchListeners(url: string, listeners: IListenerCollection): IListener[];
}
