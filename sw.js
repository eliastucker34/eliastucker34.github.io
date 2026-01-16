self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);

  if (url.searchParams.get("loop") > 5) {
    event.respondWith(
      new Response("Proxy loop blocked", { status: 508 })
    );
    return;
  }
});
