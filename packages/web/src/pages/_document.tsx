import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta
          name="description"
          content="Esports Props — the Inklings Club for Valorant and Call of Duty player props. Play-money Crowns, proprietary lines, no real gambling."
        />
        <meta name="theme-color" content="#06110c" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
