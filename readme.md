# Electron Better Web Request

This module aims to extend the usage of `electron-web-request` by allowing to bind different listeners to the lifecycle events proposed by Electron. It aligns with the base usage found [here](https://electronjs.org/docs/api/web-request), but work around [this issue](https://github.com/electron/electron/issues/10478) by proposing a multi-listeners mechanism.

It can be used as a drop-in replacement, and needs to be applied to `Electron.session` (override the default `webRequest`, see [usage](https://github.com/getstation/electron-better-web-request#usage)) to work identically. If used as is, it only uses the last registered listener for a method (retro-compatible). On top of that, the [API](https://github.com/getstation/electron-better-web-request#api) offers ways to add/remove listeners, give them context and define a custom merging strategy for all applicable listeners.

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

*⚠ Note :* If you call `enchanceWebRequest` on a session that has already been enhanced, it does NOT override the module again, preserving all the listeners that you previously registered.

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
Check the `setResolver()` API details below to see what the array `listeners` is made of.

# API

This module is built on a set of [new methods](https://github.com/getstation/electron-better-web-request#new-methods) that offer more capabilities with `webRequest`. It also exposes [alias methods](https://github.com/getstation/electron-better-web-request#alias-methods) that comply with the original `webRequest` API (to be retro-compatible). All those aliases are using the new methods under the hood so that you can use either of them indistinctly.  
Besides, you can find [helper methods](https://github.com/getstation/electron-better-web-request#helper-methods) to help manage the multiple listeners.

## New methods

To extend the behavior of web requests listeners, the module adds the following methods :

**`addListener(method, filter, action, [context])`**
- `method` *string*  
  Name of the targeted method event (onBeforeRequest, onCompleted, etc.)  

- `filter` *Object*  
  - `urls` *string[]* : An array of URL patterns that is used to filter out the requests which do not match the URL patterns. Same structure as the original filters.

- `action` *Function*  
  This function is called when the method event has happened. It matches the original signature and is passed with `action(details, [callback])`.
  - `details` *Object* : Describes the request.
  - `callback` *Function* : Passed only if the method uses callback (cf with/without callback). Should be called when the listener has done its work, with a `response` object.

- `context` *Object* (optional)  
  Holds information to tie in the listener context. You can add any properties you need to help your merging strategy (ex: `priority` or `origin`). It is automatically populated with an `order` that indicates the order in which listeners are added. The context is available in the resolver (see below).

  Example :
  ```
  {
    origin: 'pluginX',
    priority: 10,
  }
  ```  

  ---
  📄 Check [electron webRequest documentation](https://electronjs.org/docs/api/web-request) for more details about `filter`, `actions` (aka `listener` in the doc), `details` and `callback` parameters.

This function is the primary layer added to the web request. The exposed [alias methods](https://github.com/getstation/electron-better-web-request#alias-methods) are relying on this one to add and keep track of listeners under the hood.

When a listener is added (to a method event), it registers it to an internal map, merges the new filters with all pre-existing filters (other listeners), and update the bind with the underlying `electron.webRequest` (injected dependency).

When an event happens, the web request (caught in `electron.webRequest`) is passed to the module which sorts the listeners that match the URL and apply all of them.

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
  action: (details, [callback]) => {
    // listener passed as argument
  },
  context: {
    // custom context passed as argument
    order: 1 // automatically added order
  }
}
```

**`removeListener(method, id)`**  
- `method` *string*  
  Targeted method event

- `id` *string*  
  Listener ID, check the `addListener` method for more details.

Stop a listener from being triggered again: remove it from its associated method and remove its filter from the web request event.

**`clearListeners(method)`**  
- `method` *string*
  Targeted method event

Remove ALL listeners of a method, clear all associated filters and unsubscribe from this web request event.

**`setResolver(method, resolver)`**
- `method` *string*  
  Targeted method event

- `resolver` *Function*  
  This function will be called with `resolver(listeners)` when the event has happened, and listeners have been matched.  
  - `listeners` *listeners[]* : Array of object describing listeners with 2 properties :
    - `context` *Object* : Holds the context previously set when the listener was added.
    - `apply()` *Function* : Returns a `Promise` that resolves with the modified web request.   
      The modifications are applied on the original web request received in the event.  
      The results are isolated from any other applied listener.

Register a function that is used as a resolver for the given method. It is the role of the resolver to determine how to merge different listener's result into one final result.

The resolver is used only on event method with a callback. When such a method is triggered, the module sorts all the matching listeners and then calls the resolver with an array of items representing each of them.

The resolver must return the final `response` object.

Example :

```js
// Merge all listener modifications and propagate cancel if it occurs
setResolver('onBeforeRequest', (listeners) => {
  const response = listeners.reduce(async (accumulator, element) => {
    if (accumulator.cancel) {
      return accumulator
    }

    const result = await element.apply()
    return { ...accumulator, ...result }
  }, { cancel: false })
  
  return response
})
```

## Helper methods

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

## Alias methods

All the original web request methods are available :

With callback : `onBeforeRequest` `onBeforeSendHeaders` `onHeadersReceived`  
Without callback : `onSendHeaders` `onResponseStarted` `onBeforeRedirect` `onCompleted` `onErrorOccurred`

They all use the same original signature, plus an additional (and optional) set of options. Under the hood, they rely on [`addListener()`](https://github.com/getstation/electron-better-web-request#new-methods). See an example below for `onBeforeRequest` :

**`onBeforeRequest([filters ,] listener, [context])`**

- `filters` *Object* (optional)
  - `urls` *string[]* : Array of URL patterns that will be used to filter out the requests that do not match the URL patterns.

  If the `filter` is omitted then all requests will be matched.

- `listener` *Function*  
  This function will be called with `listener(details, [callback])` when the API's event has happened :
  - `details` *Object* : describes the request
  - `listener` *Function* : is passed with a `callback` (for certain events only, cf with/without callback), which should be called with a `response` object when listener has done its work.

- `context` *Object* (optional)  
  Holds information to tie in the listener context. You can add any properties you need to help your merging strategy (ex: `priority` or `origin`). It is automatically populated with an `order` that indicates the order in which listeners are added. The context is available in the resolver (see above).

Once again, for more details about `filters` or `listener` please refer to [Electron Web Request documentation](https://electronjs.org/docs/api/web-request).

## Resources

[Electron Web Request documentation](https://electronjs.org/docs/api/web-request)  
As you might have guessed since then, this module is based on electron web request and extends it. Most of its mechanics come from there. So the documentation is a good read! Did I say that already?

[Issue about web requests](https://github.com/electron/electron/issues/10478)  
This module was first thought to solve this issue and allow more than one listener per event.

[Chrome URL Match Patterns](https://developer.chrome.com/extensions/match_patterns)  
The patterns used to match URL is based on Chrome URL pattern matching.
