addEventListener("fetch", async function(event) {
  event.respondWith(await handleRequest(event.request));
});

async function handleRequest(request) {
  const { pathname } = new URL(request.url);

  if (pathname == "/") {
    return handleIndex(request);
  }

  if (pathname.endsWith(".json")) {
    return handleRaw(request);
  }

  return handleNotFound(request);
}

async function handleIndex(request) {
  const reports = await Promise.all([
    fetch(`https://raw.githubusercontent.com/caspervonb/wasi-test-results/main/wasmer.json`).then(x => x.json()),
    fetch(`https://raw.githubusercontent.com/caspervonb/wasi-test-results/main/wasmtime.json`).then(x => x.json()),
  ]);

  const summarize = ({ runtime, results }) => {
    const summary = {
      total: results.length,
      passed: results.filter(x => x.status == "PASS").length,
    };

    return `
      <section class="section card">
        <p>Ran ${summary.total} tests with ${runtime.name} (v${runtime.version})</p>
        <p>${summary.passed} / ${summary.total} test cases pass.</p>
        <progress class="progress is-small is-success has-background-danger" value="${summary.passed}" max="${summary.total}">
      </section>
    `;
  };

  const html = `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bulma@0.9.3/css/bulma.min.css">
      </head>
      <body class="container is-max-desktop">
        <header class="section">
          <h1 class="title">WebAssembly System Interface Test Suite Results</h1>
        </header>

        ${reports.map(summarize)}
      </body>
    </html>
  `;

  return new Response(html, {
    status: 404,
    headers: { "content-type": "text/html" },
  });
}

async function handleRaw(request) {
  const { pathname } = new URL(request.url);
  return fetch(`https://raw.githubusercontent.com/caspervonb/wasi-test-results/main/${pathname}`);
}

async function handleNotFound(request) {
  const html = `
    <html>
      <head></head>
      <body>
        <h2>Not Found</h2>
      </body>
    </html>
  `;

  return new Response(html, {
    status: 404,
    headers: { "content-type": "text/html" },
  });
}
