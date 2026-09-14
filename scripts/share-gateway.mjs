import http from "node:http";
import net from "node:net";

const listenPort = Number.parseInt(process.env.PULSO_SHARE_PORT ?? "9000", 10);
const targets = {
  api: { hostname: "127.0.0.1", port: 8080 },
  identity: { hostname: "127.0.0.1", port: 8180 },
  web: { hostname: "127.0.0.1", port: 3000 },
};

function targetFor(pathname) {
  if (pathname === "/api/v1" || pathname.startsWith("/api/v1/")) {
    return targets.api;
  }
  if (
    pathname.startsWith("/realms/") ||
    pathname.startsWith("/resources/") ||
    pathname.startsWith("/js/")
  ) {
    return targets.identity;
  }
  return targets.web;
}

function forwardedHeaders(request) {
  const headers = { ...request.headers };
  const publicHost =
    request.headers["x-forwarded-host"] ?? request.headers.host;
  const publicProto = request.headers["x-forwarded-proto"] ?? "http";
  delete headers["proxy-authorization"];
  headers.host = publicHost;
  headers["x-forwarded-host"] = publicHost;
  headers["x-forwarded-proto"] = publicProto;
  headers["x-forwarded-port"] = publicProto === "https" ? "443" : "80";
  return headers;
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url ?? "/", "http://pulso.local");
  if (url.pathname === "/__pulso_share/health") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ status: "UP", service: "pulso-share" }));
    return;
  }
  if (
    url.pathname.startsWith("/admin/") ||
    url.pathname.startsWith("/actuator/") ||
    url.pathname.startsWith("/metrics")
  ) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("No encontrado");
    return;
  }

  const target = targetFor(url.pathname);
  const proxyRequest = http.request(
    {
      hostname: target.hostname,
      port: target.port,
      method: request.method,
      path: request.url,
      headers: forwardedHeaders(request),
    },
    (proxyResponse) => {
      response.writeHead(
        proxyResponse.statusCode ?? 502,
        proxyResponse.headers,
      );
      proxyResponse.pipe(response);
    },
  );
  proxyRequest.setTimeout(30_000, () => proxyRequest.destroy());
  proxyRequest.on("error", () => {
    if (!response.headersSent) {
      response.writeHead(502, { "content-type": "application/json" });
    }
    response.end(
      JSON.stringify({ detail: "El servicio interno no responde." }),
    );
  });
  request.pipe(proxyRequest);
});

server.on("upgrade", (request, socket, head) => {
  const target = targetFor(
    new URL(request.url ?? "/", "http://pulso.local").pathname,
  );
  if (target !== targets.web) {
    socket.destroy();
    return;
  }
  const upstream = net.connect(target.port, target.hostname, () => {
    const headers = forwardedHeaders(request);
    const lines = [
      `${request.method} ${request.url} HTTP/${request.httpVersion}`,
    ];
    for (const [name, value] of Object.entries(headers)) {
      if (Array.isArray(value)) {
        for (const item of value) lines.push(`${name}: ${item}`);
      } else if (value !== undefined) {
        lines.push(`${name}: ${value}`);
      }
    }
    upstream.write(`${lines.join("\r\n")}\r\n\r\n`);
    if (head.length) upstream.write(head);
    socket.pipe(upstream).pipe(socket);
  });
  upstream.on("error", () => socket.destroy());
  socket.on("error", () => upstream.destroy());
});

server.listen(listenPort, "127.0.0.1", () => {
  process.stdout.write(
    `Puerta de enlace Pulso lista en http://127.0.0.1:${listenPort}\n`,
  );
});
