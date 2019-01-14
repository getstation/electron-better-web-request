import BetterWebRequest from './electron-better-web-request';

const store = new Set();

const withBetterWebRequest = (session: any) => {
  if (store.has(session)) {
    return session;
  }

  const betterWR = new BetterWebRequest(session.webRequest);
  Object.defineProperty(session, 'webRequest', {
    value: betterWR,
    writable: false,
  });

  store.add(session);
  return session;
};

export default withBetterWebRequest;
