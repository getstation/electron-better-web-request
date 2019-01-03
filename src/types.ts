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

export type WebRequestMethods = WebRequestWithCallback | WebRequestWithoutCallback;

export interface IFilter {
  urls: string[],
}

export interface IListener {
  urls: string[],
  action: Function,
}

export interface IListenerOptions {
  priority: number,
  origin: string,
}

export interface Response {
  cancel: false,
}

export interface IBetterWebRequest {
  hasCallback(method: WebRequestMethods): Boolean;

  onBeforeRequest(filter: IFilter, action: Function, options: IListenerOptions): void;
  onBeforeSendHeaders(filter: IFilter, action: Function, options: IListenerOptions): void;
  onHeadersReceived(filter: IFilter, action: Function, options: IListenerOptions): void;
  onSendHeaders(filter: IFilter, action: Function, options: IListenerOptions): void;
  onResponseStarted(filter: IFilter, action: Function, options: IListenerOptions): void;
  onBeforeRedirect(filter: IFilter, action: Function, options: IListenerOptions): void;
  onCompleted(filter: IFilter, action: Function, options: IListenerOptions): void;
  onErrorOccurred(filter: IFilter, action: Function, options: IListenerOptions): void;

  setConflictResolver(requestType: WebRequestMethods, resolver: Function): void;
}
