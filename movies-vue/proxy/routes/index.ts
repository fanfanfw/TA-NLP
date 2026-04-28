export default eventHandler((event) => {
  setHeader(event, 'content-type', 'text/html; charset=utf-8')

  return `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Nuxt Movies Proxy</title>
        <style>
          :root {
            color-scheme: dark;
            font-family: Inter, ui-sans-serif, system-ui, sans-serif;
          }

          body {
            margin: 0;
            min-height: 100vh;
            display: grid;
            place-items: center;
            background:
              radial-gradient(circle at top, rgba(0, 220, 130, 0.18), transparent 28%),
              #0b0f14;
            color: #f5f7fa;
          }

          main {
            width: min(720px, calc(100vw - 32px));
            padding: 32px;
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 24px;
            background: rgba(10, 14, 20, 0.92);
            box-shadow: 0 24px 80px rgba(0, 0, 0, 0.35);
          }

          h1 {
            margin: 0 0 12px;
            font-size: clamp(2rem, 4vw, 2.6rem);
          }

          p, li {
            color: rgba(245, 247, 250, 0.8);
            line-height: 1.6;
          }

          code {
            padding: 0.2rem 0.45rem;
            border-radius: 999px;
            background: rgba(255, 255, 255, 0.08);
            font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          }

          a {
            color: #5eead4;
          }

          ul {
            padding-left: 1.2rem;
          }
        </style>
      </head>
      <body>
        <main>
          <p>Nuxt Movies</p>
          <h1>This server is only the proxy workspace.</h1>
          <p>
            If you expected the movies UI, you likely started the wrong app.
            The proxy is only used for cached <code>/tmdb</code> and image <code>/ipx</code> requests.
          </p>
          <ul>
            <li>Start the main app from the repo root with <code>pnpm dev</code>.</li>
            <li>The proxy workspace normally runs separately on <code>localhost:3001</code>.</li>
            <li>Proxy setup docs: <a href="https://github.com/nuxt/movies/tree/main/proxy">github.com/nuxt/movies/tree/main/proxy</a>.</li>
          </ul>
        </main>
      </body>
    </html>
  `
})
