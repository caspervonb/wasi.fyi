addEventListener("fetch", async function(event) {
  event.respondWith(await handleRequest(event.request));
});

async function handleRequest(request) {
  const { pathname } = new URL(request.url);

  if (pathname.endsWith(".json")) {
    return fetch(`https://raw.githubusercontent.com/caspervonb/wasi-test-results/main/${pathname}`);
  }

  return new Response("Hello world", {
    status: 200,
    headers: { "content-type": "text/plain" },
  });
}
