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
      <section>
        <p>Ran ${summary.total} tests with ${runtime.name} (v${runtime.version})</p>
        <p>${summary.passed} / ${summary.total} test cases pass.</p>
        <progress value="${summary.passed}" max="${summary.total}">
      </section>
    `;
  };

  const html = `
    <html>
      <head></head>
      <body>
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
