const http = require("http");
const fs = require("fs");
const path = require("path");
const chokidar = require("chokidar");
const WebSocket = require("ws");
const { renderPage } = require("./render");

/**
 * Builds the live-preview server (not yet listening).
 * @param {string} inputMdPath - absolute path to the .md source
 * @returns {{ server: http.Server, watcher: import("chokidar").FSWatcher, close: () => Promise<void> }}
 */
function createPreviewServer(inputMdPath) {
  const server = http.createServer((req, res) => {
    if (req.url === "/") {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(renderPage(inputMdPath, { printMode: false }));
    } else if (req.url === "/style.css") {
      res.writeHead(200, { "Content-Type": "text/css" });
      res.end(fs.readFileSync(path.join(__dirname, "style.css")));
    } else if (req.url === "/reload-client.js") {
      res.writeHead(200, { "Content-Type": "application/javascript" });
      res.end(fs.readFileSync(path.join(__dirname, "reload-client.js")));
    } else {
      res.writeHead(404);
      res.end("Not found");
    }
  });

  const wss = new WebSocket.Server({ server });

  function broadcastReload() {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) client.send("reload");
    });
  }

  const watcher = chokidar
    .watch([inputMdPath, path.join(__dirname, "style.css"), path.join(__dirname, "template.html")])
    .on("change", () => {
      console.log("Change detected, reloading browser...");
      broadcastReload();
    });

  async function close() {
    await watcher.close();
    wss.clients.forEach((client) => client.terminate());
    await new Promise((resolve) => wss.close(resolve));
    await new Promise((resolve) => server.close(resolve));
  }

  return { server, watcher, close };
}

module.exports = { createPreviewServer };

if (require.main === module) {
  const inputMdPath = process.argv[2]
    ? path.resolve(process.argv[2])
    : path.join(__dirname, "cv.md");
  const PORT = 3000;

  const { server } = createPreviewServer(inputMdPath);
  server.listen(PORT, () => {
    console.log(`Preview: http://localhost:${PORT}`);
    console.log(`Watching: ${inputMdPath}`);
  });
}
