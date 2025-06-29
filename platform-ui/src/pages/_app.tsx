// platform-ui/src/pages/_app.tsx
import type { AppProps } from 'next/app';
import Head from 'next/head';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;700&family=Orbitron:wght@700&display=swap" rel="stylesheet" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Component {...pageProps} />
      <style jsx global>{`
        body { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Inter', sans-serif; background-color: #0d0d15; color: #f0f0f0; line-height: 1.6; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
        h1, h2, h3, h4, h5, h6 { font-family: 'Orbitron', sans-serif; color: #f0f0f0; letter-spacing: -0.04em; line-height: 1.2; }
        a { color: #00CCFF; text-decoration: none; }
        a:hover { text-decoration: underline; }
      `}</style>
    </>
  );
}

export default MyApp;