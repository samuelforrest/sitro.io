// platform-ui/src/pages/_document.tsx
import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/*
          Google Fonts <link> tags should be placed here in _document.tsx
          This ensures they load globally and only once per server request.
        */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" /> {/* FIXED LINE */}
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;700&family=Orbitron:wght@700&display=swap" rel="stylesheet" />
        {/*
          Any other global meta tags, favicons, or external scripts
          that should load *before* the main React app (Next.js) loads.
        */}
      </Head>
      <body>
        <Main /> {/* Renders your Next.js app components */}
        <NextScript /> {/* Renders Next.js scripts for client-side hydration */}
      </body>
    </Html>
  );
}