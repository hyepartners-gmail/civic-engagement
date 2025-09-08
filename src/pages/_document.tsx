import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Preloaded Font Files */}
        <link
          rel="preload"
          href="/fonts/manjari-thin.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/manjari-regular.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/manjari-bold.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        {/* Inline Font CSS */}
        <style dangerouslySetInnerHTML={{
          __html: `
            @font-face {
              font-family: 'Manjari';
              font-style: normal;
              font-weight: 100;
              font-display: swap;
              src: url('/fonts/manjari-thin.woff2') format('woff2');
              unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
            }
            @font-face {
              font-family: 'Manjari';
              font-style: normal;
              font-weight: 400;
              font-display: swap;
              src: url('/fonts/manjari-regular.woff2') format('woff2');
              unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
            }
            @font-face {
              font-family: 'Manjari';
              font-style: normal;
              font-weight: 700;
              font-display: swap;
              src: url('/fonts/manjari-bold.woff2') format('woff2');
              unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
            }
          `
        }} />
        {/* Preload critical budget data JSON files */}
        <link rel="preload" href="/federal_budget/rollup.json" as="fetch" crossOrigin="anonymous" />
        <link rel="preload" href="/federal_budget/hierarchy.json" as="fetch" crossOrigin="anonymous" />
        <link rel="preload" href="/federal_budget/terms.json" as="fetch" crossOrigin="anonymous" />
        <link rel="preload" href="/federal_budget/macro.json" as="fetch" crossOrigin="anonymous" />
        <link rel="preload" href="/federal_budget/events.json" as="fetch" crossOrigin="anonymous" />
        <link rel="preload" href="/federal_budget/tax_policy.json" as="fetch" crossOrigin="anonymous" />
        <link rel="preload" href="/federal_budget/cbo_projection.json" as="fetch" crossOrigin="anonymous" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}