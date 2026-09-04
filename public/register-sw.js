/*
 * Registers /sw.js on the production web build only.
 *
 * Skipped when:
 *   - the page runs inside the Capacitor shell (native apps bundle their own
 *     assets; a worker would only fight the WebView cache), or
 *   - the page is served by the Vite dev server (port 3000, see vite.config.ts)
 *     where module URLs change on every edit.
 *
 * When a new worker has installed while an older one still controls the page,
 * this dispatches `cvbase:sw-update` on `window` with
 *   detail: { registration: ServiceWorkerRegistration, apply: () => void }
 * `apply()` tells the waiting worker to skip waiting; the page reloads once it
 * takes control. If nobody listens, the update simply applies on next launch.
 */
(() => {
  if (!('serviceWorker' in navigator)) return;
  const isCapacitor =
    !!window.Capacitor ||
    ['capacitor:', 'ionic:'].includes(location.protocol) ||
    (location.hostname === 'localhost' && location.port === '');
  const isViteDev = ['localhost', '127.0.0.1'].includes(location.hostname) && location.port === '3000';
  if (isCapacitor || isViteDev) return;

  const announce = (registration) => {
    const waiting = registration.waiting;
    if (!waiting || !navigator.serviceWorker.controller) return;
    window.dispatchEvent(
      new CustomEvent('cvbase:sw-update', {
        detail: { registration, apply: () => waiting.postMessage({ type: 'SKIP_WAITING' }) },
      }),
    );
  };

  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return;
    reloading = true;
    location.reload();
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        announce(registration);
        registration.addEventListener('updatefound', () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed') announce(registration);
          });
        });
      })
      .catch(() => {
        /* registration is a progressive enhancement */
      });
  });
})();
