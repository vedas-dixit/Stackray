import { useEffect, useState } from 'preact/hooks';
import { Home } from './home';
import { Preview } from './preview/preview';

type Route = 'home' | 'preview';

function routeFromHash(): Route {
  return location.hash === '#preview' ? 'preview' : 'home';
}

/** Hash router: `/` is the snapshot viewer, `/#preview` the component page. */
export function App() {
  const [route, setRoute] = useState<Route>(routeFromHash);
  useEffect(() => {
    const onHash = () => setRoute(routeFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  return route === 'preview' ? <Preview /> : <Home />;
}
