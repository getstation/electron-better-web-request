# Electron Better Web Request

This module aims to extends the usage of `electron-web-request` by allowing to bind different listeners to the lifecycle events proposed by Electron. It aligns with the base usage found [here](https://electronjs.org/docs/api/web-request), but work around [this issue](https://github.com/electron/electron/issues/10478) by proposing a multi-listeners mecanism.

It can be used as a drop in replacement, and only needs to receive the `electron-web-request` as an injected dependency to work indenticaly. If used as is, it will only use the last registered listener for a method (retro-compatible). On top of that, the [API]() offers ways to add / remove listeners, give them context and define a custom merging strategy for all applicable listeners.

## Getting started

### Install

```bash
npm install electron-better-web-request
```

### Usage

**Override Electron web request**
```js
enhanceWebRequest(session)
```
Calling `enhanceWebRequest()` with the target `session` will override its `webRequest` with this module. From there, you can keep using it as usual, with all the new benefits.

*⚠ Note :* If you call `enchanceWebRequest` on a session that has already been enhanced, it will NOT override again the module, preserving all the listeners that you previously registered.

**Basic drop in replacement**
```js
const filter = {
  urls: ['https://*.github.com/*', '*://electron.github.io']
}

session.webRequest.onBeforeSendHeaders(filter, (details, callback) => {
  details.requestHeaders['User-Agent'] = 'MyAgent'
  callback({cancel: false, requestHeaders: details.requestHeaders})
})
```

**With merging strategy**
```js
const filter = {
  urls: ['https://*.github.com/*', '*://electron.github.io']
}

// Add more than one listener...
session.webRequest.onBeforeSendHeaders(filter, (details, callback) => {
  details.requestHeaders['User-Agent'] = 'MyAgent'
  callback({cancel: false, requestHeaders: details.requestHeaders})
})

session.webRequest.onBeforeSendHeaders(filter, (details, callback) => {
  // Alter the web request in another way
  callback({cancel: false, [...]})
})

[...]

// ... then define a resolver with your own strategy
session.webRequest.setResolver('onBeforeSendHeaders', (listeners) => {
  // "listeners" is an array of objects representing matching listeners for the current web request
  // Use context and results to decide what to execute and how to merge
  // Return your final result
  
  // Example : Default resolver implementation
  // -> modify the web request only with the last registered listener
  const sorted = listeners.sort((a, b) => b.context.order - a.context.order)
  const last = sorted[0]
  return last.apply()
})
```
Check the API details below to see what the array [`listeners` is made of]().

## API

### Event methods

All the original web request methods are available :

With callback : `onBeforeRequest` `onBeforeSendHeaders` `onHeadersReceived`  
Without callback : `onSendHeaders` `onResponseStarted` `onBeforeRedirect` `onCompleted` `onErrorOccurred`

The all use the same original signature, plus an additional (and optional) set of options. See an example below for `onBeforeRequest` :

**`onBeforeRequest([filters ,] listener, [context])`**

- `filters` *Object* (optional)
  - `urls` *string[]* : Array of URL patterns that will be used to filter out the requests that do not match the URL patterns.

  If the `filter` is omitted then all requests will be matched.

- `listener` *Function*  
  This function will be called with `listener(details, [callback])` when the API's event has happened :
  - `details` *Object* : describes the request
  - `listener` *Function* : is passed with a `callback` (for certain events only, cf with/without callback), which should be called with a `response` object when listener has done its work.

- `context` *Object* (optional)  
  This object can hold any informations you wish to be associated with your `listener`. They will be tied to its context and can be used later on in your resolver strategy (cf [`setResolver()`]() below).

---
For more details about `filters` or `listener` please refer to [Electron Web Request documentation](https://electronjs.org/docs/api/web-request).

### Additionnal methods

To extend the behavior of web requests listeners, the module adds the following methods :

**`addListener(method, filter, action, [context])`**
- `method` *string*  
  Name of the targeted method event (onBeforeRequest, onCompleted, etc.)  

- `filter` *Object*  
  - `urls` *string[]* : Array of URL patterns that will be used to filter out the requests that do not match the URL patterns. Same structure as the original filters.

- `action` *Function*  
  Function that will be called when the method event has happened. It matches the original signature and will be called with `action(details, [callback])`.
  - `details` *Object* : describes the request. Check the Electron documentation for more details.
  - `callback` *Function* : passed only if the method uses callback (cf with/without callback). Should be called when the listener has done its work, with a `response` object.

- `context` *Object* (optional)  
  Holds informations to tie in the listener context. You can add any properties you need to help your merging strategy (ex: `priority` or `origin`). It will automatically be populated with an `order` that indicates the order in which listeners are added.  
  Example :
  ```
  {
    origin: 'pluginX',
    priority: 10,
  }
  ```

This function is the main layer added to the web request. The exposed [event methods]() are alias relying on this one to add and keep track of listeners under the hood.

When a listener is added (to a method event), it registers it to an internal map, merge the new filters with all pre-existing filters (other listeners), and update the bind with the underlying `electron.webRequest` (injected dependency).

When an event happens, the web request (catched in `electron.webRequest`) is passed to the module which will sort the listeners that matches the URL and apply all of them.

- If the event method doesn't have a callback, all listeners are applied.

- If the event method has a callback, the web request can be modified, and the resolver is used to determine how the web request should be modified, and send the final result. See the `setResolver()` below for more details.

The method `addListener()` returns an object describing a listener, such as :  
```js
{
  id: '<generated listener id>',
  urls: [
    'pattern A',
    'pattern B',
  ],
  action: (details, [callback]) => { /* listener action when triggered */ },
  context: {
    // any custom information
    order: 1 // generated order
  }
}
```

**`removeListener(method, id)`**  
- `method` *string*  
  Targeted method event

- `id` *string*  
  Listener ID, check the `addListener` method for more details.

Stop a listener from being triggered again : remove it from its associated method and remove its filter from the web request event.

**`clearListeners(method)`**  
- `method` *string*
  Targeted method event

Remove ALL listeners of a method, clear all associated filters and unsubscribe from this web request event.

**`setResolver(method, resolver)`**
- `method` *string*  
  Targeted method event

- `resolver` *Function*  
  A function with the sigature : `resolver(listeners) => {}`. Used to blabla, do blabla.

Assign to, and used to do something awesome.

### Helper methods

**`hasCallback(method)`**  
- `method` *string*  
  Targeted method event

Return `true` if the given method name has a callback.

**`getListeners()`**  

Get all the listeners, sorted by method.

**`getListenersFor(method)`**  
- `method` *string*  
  Targeted method event

Get all the listeners associated with a method.

**`getFilters()`**  

Get all the filters, sorted by method.

**`getFiltersFor(method)`**  
- `method` *string*  
  Targeted method event

Get all the filters associated with a method.

## Resources

[Electron Web Request documentation](https://electronjs.org/docs/api/web-request)  
This module is based on electron web request and extends it. Most of its mecanics come from there.

[Issue about web requests](https://github.com/electron/electron/issues/10478)  
This module was first thought to solve this issue and allow more than one listener per event.

[Chrome URL Match Patterns](https://developer.chrome.com/extensions/match_patterns)  
The patterns used to match URL is based on Chrome URL pattern matching.
