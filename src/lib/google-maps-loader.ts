// Loads the Maps JavaScript API (+ Visualization library, for the heatmap layer) exactly once,
// even if called from multiple mounts. The key ships to the browser because the Maps JS API
// requires that — restrict it by HTTP referrer in Google Cloud Console rather than trying to
// hide it server-side.
let loadingPromise: Promise<void> | null = null;

export function loadGoogleMaps(apiKey: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.google?.maps) return Promise.resolve();
  if (loadingPromise) return loadingPromise;

  loadingPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-carrier-crm-gmaps]');
    if (existing) {
      const check = setInterval(() => {
        if (window.google?.maps) {
          clearInterval(check);
          resolve();
        }
      }, 200);
      return;
    }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=visualization`;
    script.async = true;
    script.dataset.carrierCrmGmaps = 'true';
    script.onload = () => {
      const check = setInterval(() => {
        if (window.google?.maps) {
          clearInterval(check);
          resolve();
        }
      }, 100);
    };
    script.onerror = () => reject(new Error('Failed to load Google Maps script.'));
    document.head.appendChild(script);
  });

  return loadingPromise;
}
