// platform-ui/src/pages/_app.tsx
import type { AppProps } from 'next/app';
// No need to import Head here if only favicon is left.
// You can remove this import if you prefer, or keep it for the favicon link.
import Head from 'next/head'; 

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        {/*
          IMPORTANT:
          The Google Fonts <link> tags were MOVED from here to _document.tsx
          to resolve the @next/next/no-page-custom-font warning.
        */}
        {/* Favicon - This can stay here, or also move to _document.tsx if desired */}
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Component {...pageProps} />
      <style jsx global>{`
        /* Global styles for your platform's UI (these are fine here) */
        body { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Inter', sans-serif; background-color: #0d0d15; color: #f0f0f0; line-height: 1.6; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
        h1, h2, h3, h4, h5, h6 { font-family: 'Orbitron', sans-serif; color: #f0f0f0; letter-spacing: -0.04em; line-height: 1.2; }
        a { color: #00CCFF; text-decoration: none; }
        a:hover { text-decoration: underline; }
      `}</style>
    </>
  );
}

export default MyApp;