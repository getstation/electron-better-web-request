# Electron Better Web Request

This module aims to extends the usage of `electron-web-request` by allowing to bind many different listeners to the lifecycle events proposed by Electron. It aligns with the base usage found (here)[https://electronjs.org/docs/api/web-request], but work around (this issue)[https://github.com/electron/electron/issues/10478] by proposing a multi-listeners mecanism.

It can be used as a drop in replacement, and only needs to receive the `electron-web-request` as an injected dependency to work indenticaly. If used as is, it will only use the last registered listener for a method, to be retro-compatible. On top of that, the (API)[] offers ways to add / remove listeners, give context to listeners and define a custom merging strategy for all applicable listeners.

## Getting started

### Install

```
npm install electron-better-web-request
```

### Usage

Override Electron web request
```
defaultSession.webRequest = require('better-electron-web-request')(defaultSession.webRequest)
```

Basic drop in replacement
```
const filter = {
  urls: ['https://*.github.com/*', '*://electron.github.io']
}

defaultSession.webRequest.onBeforeSendHeaders(filter, (details, callback) => {
  details.requestHeaders['User-Agent'] = 'MyAgent'
  callback({cancel: false, requestHeaders: details.requestHeaders})
})
```

With merging strategy
```
const filter = {
  urls: ['https://*.github.com/*', '*://electron.github.io']
}

// Add more than one listener, then define your resolver
defaultSession.webRequest.onBeforeSendHeaders(filter, (details, callback) => {
  details.requestHeaders['User-Agent'] = 'MyAgent'
  callback({cancel: false, requestHeaders: details.requestHeaders})
})

defaultSession.webRequest.onBeforeSendHeaders(filter, (details, callback) => {
  // Alter the web request in another way
  callback({cancel: false, [...]})
})

[...]

// Define a resolver with your own strategy
default.webRequest.setConflictResolver('onBeforeSendHeaders', (listenerAppliers) => {
  // listenerAppliers is an array of objects, each of them being : a listener applied to the web request and a context
  // Use context and results to decide what to execute and how to merge
  // Return your final result
})
```
Check the API details below to see what the array (`listenerAppliers` is made of)[], and check the (default resolver implementation)[] as example.

## API

### Event methods

With callback :
`onBeforeRequest`
`onBeforeSendHeaders`
`onHeadersReceived`

Without callback :
`onSendHeaders`
`onResponseStarted`
`onBeforeRedirect`
`onCompleted`
`onErrorOccurred`

### Additionnal methods

`addListener`
`removeListener`
`setConflictResolver`
`hasCallback`
`getListeners`
`getListenersFor`

## Resources