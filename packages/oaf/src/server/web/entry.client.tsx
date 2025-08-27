import createEmotionCache from "@emotion/cache";
import { CacheProvider } from "@emotion/react";
import { HydratedRouter } from "react-router/dom";
import React from "react";
import { StrictMode, startTransition } from "react";
import { hydrateRoot } from "react-dom/client";

const hydrate = () => {
  const emotionCache = createEmotionCache({ key: "css" });

  startTransition(() => {
    hydrateRoot(
      document,
      <StrictMode>
        <CacheProvider value={emotionCache}>
          <HydratedRouter />
        </CacheProvider>
      </StrictMode>,
    );
  });
};

if (typeof requestIdleCallback === "function") {
  requestIdleCallback(hydrate);
} else {
  // Safari doesn't support requestIdleCallback
  // https://caniuse.com/requestidlecallback
  setTimeout(hydrate, 1);
}
