addEventListener("fetch", function (event) {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const { pathname } = new URL(request.url);

  if (pathname == "/") {
    return handleIndex(request);
  }

  if (pathname.endsWith(".json")) {
    return handleRaw(request);
  }

  return handleView(request);
}

async function handleIndex(request) {
  const reports = await Promise.all(
    ["deno", "node", "wasmer", "wasmtime"]
      .map((x) =>
        fetch(
          `https://raw.githubusercontent.com/caspervonb/wasi-test-results/main/${x}.json`,
        ).then((x) => x.json())
      ),
  );

  const content = reports.map(({ runtime, results }) => {
    const summary = {
      total: results.length,
      passed: results.filter((x) => x.status == "PASS").length,
    };

    return `
      <section class="section card">
        <p>Ran ${summary.total} tests with ${runtime.name} (v${runtime.version})</p>
        <p>${summary.passed} / ${summary.total} test cases pass.</p>
        <progress class="progress is-small is-success has-background-danger" value="${summary.passed}" max="${summary.total}"></progress>
        <a href="${runtime.name}">View more</a>
      </section>
    `;
  }).join("");

  const html = layout({
    content,
  });

  return new Response(html, {
    status: 200,
    headers: { "content-type": "text/html" },
  });
}

async function handleView(request) {
  const { pathname } = new URL(request.url);
  const { results } = await fetch(
    `https://raw.githubusercontent.com/caspervonb/wasi-test-results/main/${pathname}.json`,
  ).then((x) => x.json());
  const content = results.map(({ name, status, message }) => {
    if (status == "PASS") {
      return `
        <li class="box">
          <span class="icon-text has-text-success">
            <span class="icon">
              <i class="fas fa-check-square"></i>
            </span>
            <span>${name}</span>
          </span>
        </li>
        `;
    }

    return `
      <li class="box">
        <span class="icon-text has-text-danger">
          <span class="icon">
            <i class="fas fa-ban"></i>
          </span>
          <span>${name}</span>
        </span>
        <div><pre class="block">${escape(message)}</pre></div>
      </li>
      `;
  }).join("\n");

  const html = layout({
    content,
  });

  return new Response(html, {
    status: 200,
    headers: { "content-type": "text/html" },
  });
}

async function handleRaw(request) {
  const { pathname } = new URL(request.url);
  return fetch(
    `https://raw.githubusercontent.com/caspervonb/wasi-test-results/main/${pathname}`,
  );
}

function layout({ content }) {
  return `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bulma@0.9.3/css/bulma.min.css">
      </head>
      <body class="container is-max-desktop">
        <header class="section">
          <h1 class="title">WebAssembly System Interface Test Suite Results</h1>
        </header>

        ${content}
      </body>
    </html>
  `;
}

function escape(unsafe) {
  return unsafe.replace(/[&<>"']/g, (m) => `&#${m.charCodeAt(0)};`);
}
