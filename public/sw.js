self.addEventListener("push", (event) => {
  const fallback = {
    title: "Pronosticat",
    body: "Tens un avís nou.",
    url: "/",
    tag: "pronosticat",
  };

  let payload = fallback;
  try {
    const data = event.data?.json();
    if (data && typeof data === "object") {
      payload = {
        title: typeof data.title === "string" ? data.title : fallback.title,
        body: typeof data.body === "string" ? data.body : fallback.body,
        url: typeof data.url === "string" ? data.url : fallback.url,
        tag: typeof data.tag === "string" ? data.tag : fallback.tag,
      };
    }
  } catch {
    payload = fallback;
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: payload.tag,
      renotify: true,
      lang: "ca",
      data: { url: payload.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of windows) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) {
            await client.navigate(targetUrl);
          }
          return;
        }
      }
      await self.clients.openWindow(targetUrl);
    })(),
  );
});
