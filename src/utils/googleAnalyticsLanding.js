const GA_MEASUREMENT_ID = 'G-P1E5499RRY';

/** Google Analytics só na landing pública (acessos à “página inicial” de marketing). */
export function trackLandingPageView() {
  if (typeof window === 'undefined') return;

  window.dataLayer = window.dataLayer || [];

  if (!window.gtag) {
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };
    window.gtag('js', new Date());

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);
  }

  window.gtag('config', GA_MEASUREMENT_ID, {
    page_path: window.location.pathname || '/',
    page_location: window.location.href,
    send_page_view: true,
  });
}
