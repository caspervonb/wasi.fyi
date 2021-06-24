addEventListener("fetch", (event) => {
  event.respondWith(
    new Response("Hello world", {
      status: 200,
      headers: { "content-type": "text/plain" },
    }),
  );
});
