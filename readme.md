# Electron Better Web Request

This module aims to extends the usage of `electron-web-request` by allowing to bind different listeners to the lifecycle events proposed by Electron. It aligns with the base usage found [here](https://electronjs.org/docs/api/web-request), but work around [this issue](https://github.com/electron/electron/issues/10478) by proposing a multi-listeners mecanism.

It can be used as a drop in replacement, and only needs to receive the `electron-web-request` as an injected dependency to work indenticaly. If used as is, it will only use the last registered listener for a method (retro-compatible). On top of that, the [API]() offers ways to add / remove listeners, give them context and define a custom merging strategy for all applicable listeners.

## Getting started

### Install

```bash
npm install electron-better-web-request
```

### Usage

Override Electron web request
```js
const BetterWebRequest = require('better-electron-web-request')
defaultSession.webRequest = new BetterWebRequest(defaultSession.webRequest)
```

Basic drop in replacement
```js
const filter = {
  urls: ['https://*.github.com/*', '*://electron.github.io']
}

defaultSession.webRequest.onBeforeSendHeaders(filter, (details, callback) => {
  details.requestHeaders['User-Agent'] = 'MyAgent'
  callback({cancel: false, requestHeaders: details.requestHeaders})
})
```

With merging strategy
```js
const filter = {
  urls: ['https://*.github.com/*', '*://electron.github.io']
}

// Add more than one listener...
defaultSession.webRequest.onBeforeSendHeaders(filter, (details, callback) => {
  details.requestHeaders['User-Agent'] = 'MyAgent'
  callback({cancel: false, requestHeaders: details.requestHeaders})
})

defaultSession.webRequest.onBeforeSendHeaders(filter, (details, callback) => {
  // Alter the web request in another way
  callback({cancel: false, [...]})
})

[...]

// ... then define a resolver with your own strategy
default.webRequest.setResolver('onBeforeSendHeaders', (listeners) => {
  // "listeners" is an array of objects representing matching listeners for the current web request
  // Use context and results to decide what to execute and how to merge
  // Return your final result
  
  // Example : Default resolver implementation
  // -> modify the web request only with the last registered listener
  const sorted = listeners.sort((a, b) => b.context.order - a.context.order);
  const last = sorted[0];
  return last.apply();
})
```
Check the API details below to see what the array[`listeners` is made of]().

## API

### Event methods

All the original web request methods are available :

With callback : `onBeforeRequest` `onBeforeSendHeaders` `onHeadersReceived`  
Without callback : `onSendHeaders` `onResponseStarted` `onBeforeRedirect` `onCompleted` `onErrorOccurred`

The all use the same original signature, plus an additional (and optional) set of options :

**`onBeforeRequest([filters ,] listener, [options])`**

- `filters` *Object* (optional)
  - `urls` *string[]* : Array of URL patterns that will be used to filter out the requests that do not match the URL patterns.

  If the `filter` is omitted then all requests will be matched.

- `listener` *Function*  
  This function will be called with `listener(details, [callback])` when the API's event has happened :
  - `details` object describes the request
  - `listener` is passed with a `callback` (for certain events only, cf with/without callback), which should be called with a `response` object when listener has done its work.

- `options` *Object* (optional)  
  This object can hold any options you wish to be associated with your `listener`. They will be tied to its context and can be used later on in your resolver strategy (cf `setResolver()` below).

---
For more details about `filters` or `listener` please refer to [Electron Web Request documentation](https://electronjs.org/docs/api/web-request).

### Additionnal methods

To extend the behavior of web requests listeners, the module adds the following methods :

**`addListener()`**

**`removeListener()`**

**`clearListeners()`**

**`setResolver()`**

**`hasCallback()`**

**`getListeners()`**

**`getListenersFor()`**

## Resources
Electron Web Request  
Issue about web requests  
Chrome URL pattern matching  
