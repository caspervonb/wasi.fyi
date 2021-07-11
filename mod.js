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

  const entries = await Promise.all(directories.map(directory => {
    return fetch(`https://api.github.com/repos/caspervonb/wasi-test-data/contents/${directory.path}`, {
      headers: {
        "Authorization": `token ${GITHUB_TOKEN}`,
        "Accept": "application/vnd.github.v3+json",
      },
    }).then(response => response.json());
  })).then(entries => entries.map(entries => entries[entries.length - 1]));

  entries.sort((a, b) => a.path.localeCompare(b.path));

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
      <section class="container">
        <p>Ran <strong>${summary.total}</strong> tests with <strong>${runtime.name} v${runtime.version}</strong></p>
        <p><strong>${summary.passed} / ${summary.total}</strong> tests pass.</p>
        <progress class="summary" value="${summary.passed}" max="${summary.total}"></progress>
        <a href="/${path}">View results</a>
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

  results.sort((a, b) => a.path.localeCompare(b.path));

  const table = [
    `<table class="container">`,
    `<thead>`,
    `  <td>Path</td>`,
    `  <td>Status</td>`,
    `</thead>`,

    results.map(({ path, status, message }) => {
      if (message.length > 0) {
        const details = `<pre>${message}</pre>`;

        return `
        <tr class="${status.toLowerCase()}">
          <td>${path}</td>
          <td><details><summary>${status}</summary>${details}</details></td>
        </tr>
        `;
      }

      return `
        <tr class="${status.toLowerCase()}">
          <td>${path}</td>
          <td>${status}</td>
        </tr>
      `;
    }).join("\n"),
    `</table>`,
  ].join("\n");

  const content = `
    ${table}
  `;

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
        <style>
          @import "https://unpkg.com/@picocss/pico@latest/css/pico.min.css";

          [data-theme="light"], :root:not([data-theme="dark"]) {
            --pass: #288a6a;
            --fail: #b94646;
          }

          [data-theme="dark"] {
            --valid: #1f7a5c;
            --invalid: #943838;
          }

          @media only screen and (prefers-color-scheme: dark) {
            :root:not([data-theme="light"]) {
              --pass: #1f7a5c;
              --fail: #943838;
            }
          }

          td details {
            border-bottom: none;
            margin-bottom: 0;
            padding-bottom: 0;
          }

          td details summary {
            color: inherit;
          }

          tr.pass td {
            color: var(--pass);
          }

          tr.fail td {
            color: var(--fail);
          }
        </style>
      </head>
      <body>
        <nav class="container">
          <h1 class="title">WebAssembly System Interface Test Suite Results</h1>
        </nav>

        ${content}
      </body>
    </html>
  `;
}

function escape(unsafe) {
  return unsafe.replace(/[&<>"']/g, (m) => `&#${m.charCodeAt(0)};`);
}
