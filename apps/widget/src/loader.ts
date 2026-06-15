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

import { resolveWidgetAppUrl } from "./utils/widget-loader";

declare const __WIDGET_VERSION__: string;

(function() {
  // Version updated on each deployment - change this when deploying updates
  const WIDGET_VERSION = __WIDGET_VERSION__;

  // Get the current script to read data attributes
  const currentScript = document.currentScript as HTMLScriptElement;
  if (!currentScript) {
    console.error('[FrontFace] Could not find loader script');
    return;
  }

  // Create the actual widget script
  const widgetScript = document.createElement('script');
  widgetScript.src = resolveWidgetAppUrl({
    loaderSrc: currentScript.src,
    version: WIDGET_VERSION,
  });
  widgetScript.async = true;

  // Copy all data attributes from loader to widget script
  const dataAttrs = currentScript.dataset;
  for (const key in dataAttrs) {
    widgetScript.dataset[key] = dataAttrs[key];
  }

  // Also copy specific attributes that might be set directly
  const attrsToCopy = ['data-project-id', 'data-api-url', 'data-position', 'data-primary-color', 'data-title', 'data-greeting'];
  attrsToCopy.forEach(attr => {
    const value = currentScript.getAttribute(attr);
    if (value) {
      widgetScript.setAttribute(attr, value);
    }
  });

  // Append to document
  document.head.appendChild(widgetScript);
})();
