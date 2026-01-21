/**
 * Widget Loader
 *
 * A tiny loader script that dynamically loads the main widget with cache busting.
 * This file should be cached briefly (5 min) while the main widget can be cached longer.
 *
 * When deploying widget updates:
 * 1. Build the widget (generates new hash)
 * 2. Update WIDGET_VERSION below
 * 3. Upload both loader and widget to Supabase
 *
 * Users will get the new widget within 5 minutes without hard refresh.
 */

(function() {
  // Version updated on each deployment - change this when deploying updates
  const WIDGET_VERSION = '__WIDGET_VERSION__';

  const WIDGET_BASE_URL = 'https://hynaqwwofkpaafvlckdm.supabase.co/storage/v1/object/public/assets';

  // Get the current script to read data attributes
  const currentScript = document.currentScript as HTMLScriptElement;
  if (!currentScript) {
    console.error('[SupportBase] Could not find loader script');
    return;
  }

  // Check if running locally (localhost, 127.0.0.1, or file://)
  const isLocal = window.location.hostname === 'localhost'
    || window.location.hostname === '127.0.0.1'
    || window.location.protocol === 'file:';

  // Determine the widget-app.js URL
  let widgetAppUrl: string;
  if (isLocal) {
    // Load from local dist folder (relative to loader script)
    const loaderSrc = currentScript.src;
    const basePath = loaderSrc.substring(0, loaderSrc.lastIndexOf('/'));
    widgetAppUrl = `${basePath}/widget-app.js?v=${Date.now()}`; // Cache bust with timestamp
  } else {
    // Load from Supabase CDN in production
    widgetAppUrl = `${WIDGET_BASE_URL}/widget-app.js?v=${WIDGET_VERSION}`;
  }

  // Create the actual widget script
  const widgetScript = document.createElement('script');
  widgetScript.src = widgetAppUrl;
  widgetScript.async = true;

  // Copy all data attributes from loader to widget script
  const dataAttrs = currentScript.dataset;
  for (const key in dataAttrs) {
    widgetScript.dataset[key] = dataAttrs[key];
  }

  // Also copy specific attributes that might be set directly
  const attrsToСopy = ['data-project-id', 'data-api-url', 'data-position', 'data-primary-color', 'data-title', 'data-greeting'];
  attrsToСopy.forEach(attr => {
    const value = currentScript.getAttribute(attr);
    if (value) {
      widgetScript.setAttribute(attr, value);
    }
  });

  // Append to document
  document.head.appendChild(widgetScript);
})();
