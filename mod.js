const GITHUB_TOKEN = Deno.env.get("GITHUB_TOKEN");

addEventListener("fetch", function (event) {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const { pathname } = new URL(request.url);

  if (pathname == "/") {
    return handleIndex(request);
  }

  return handleView(request);
}

async function handleIndex(request) {
  const commit = await fetch(`https://api.github.com/repos/caspervonb/wasi-test-suite/commits/main`, {
    headers: {
      "Authorization": `token ${GITHUB_TOKEN}`,
      "Accept": "application/vnd.github.v3+json.sha",
    },
  }).then(response => response.json());

  const directories = await fetch(`https://api.github.com/repos/caspervonb/wasi-test-data/contents/${commit.sha}`, {
    headers: {
      "Authorization": `token ${GITHUB_TOKEN}`,
      "Accept": "application/vnd.github.v3+json",
    },
  }).then(response => response.json());

  const entries = await Promise.all(directories.map(async directory => {
    return await fetch(`https://api.github.com/repos/caspervonb/wasi-test-data/contents/${directory.path}`, {
      headers: {
        "Authorization": `token ${GITHUB_TOKEN}`,
        "Accept": "application/vnd.github.v3+json",
      },
    }).then(response => response.json());
  })).then(results => results.flat());

  const files = await Promise.all(entries.map((entry) => {
    return fetch(`https://api.github.com/repos/caspervonb/wasi-test-data/contents/${entry.path}`, {
      headers: {
        "Authorization": `token ${GITHUB_TOKEN}`,
        "Accept": "application/vnd.github.v3.raw",
      },
    }).then(response => response.json());
  }));

  const html = layout({
    content: files.map(({ runtime, results, entry }, index) => {
      const path = entries[index].path.slice(0, -5);
      const summary = {
        total: results.length,
        passed: results.filter((x) => x.status == "PASS").length,
      };

      return `
      <section class="box">
        <p>Ran ${summary.total} tests with ${runtime.name} (v${runtime.version})</p>
        <p>${summary.passed} / ${summary.total} test cases pass.</p>
        <progress class="progress is-small is-success has-background-danger" value="${summary.passed}" max="${summary.total}"></progress>
        <a href="/${path}">View more</a>
      </section>
    `;
    }).join(""),
  });

  return new Response(html, {
    status: 200,
    headers: { "content-type": "text/html" },
  });
}

async function handleView(request) {
  const { pathname } = new URL(request.url);
  const path = `${pathname.slice(1)}.json`;

  const { results } = await fetch(`https://api.github.com/repos/caspervonb/wasi-test-data/contents/${path}`, {
    headers: {
      "Authorization": `token ${GITHUB_TOKEN}`,
      "Accept": "application/vnd.github.v3.raw",
    },
  }).then(response => response.json());

  const content = results.map(({ path, status, message }) => {
    const success = status == "PASS";
    const content = message && message.length > 0
      ? `<div><pre class="block">${escape(message)}</pre></div>`
      : ``;

    return `
      <li class="box">
        <span class="icon-text ${success ? "has-text-success" : "has-text-danger"}">
          <span class="icon">
            <i class="fas ${success ? "fa-check-square" : "fa-ban"}"></i>
          </span>
          <span>${path}</span>
        </span>
        ${content}
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

function layout({ content }) {
  return `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bulma@0.9.3/css/bulma.min.css">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css">
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
