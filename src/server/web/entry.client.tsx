import { CacheProvider } from "@emotion/react";
import { RemixBrowser } from "@remix-run/react";
import React, { useState } from "react";
import { hydrate } from "react-dom";

import { ClientStyleContext } from "./context.js";
import createEmotionCache, { defaultCache } from "./createEmotionCache.js";

interface ClientCacheProviderProps {
  children: React.ReactNode;
}

function ClientCacheProvider({ children }: ClientCacheProviderProps) {
  const [cache, setCache] = useState(defaultCache);

  function reset() {
    setCache(createEmotionCache());
  }

  return (
    <ClientStyleContext.Provider value={{ reset }}>
      <CacheProvider value={cache}>{children}</CacheProvider>
    </ClientStyleContext.Provider>
  );
}

hydrate(
  <ClientCacheProvider>
    <RemixBrowser />
  </ClientCacheProvider>,
  document,
);
