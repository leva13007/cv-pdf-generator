const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const WebSocket = require("ws");
const { createPreviewServer } = require("../server");

let tmpDir, mdPath, preview, baseUrl;

before(async () => {
  // work on a temp copy so the watcher test can modify it freely
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cv-preview-"));
  mdPath = path.join(tmpDir, "cv.md");
  fs.copyFileSync(path.join(__dirname, "fixtures", "sample.md"), mdPath);

  preview = createPreviewServer(mdPath);
  await new Promise((resolve) => preview.watcher.on("ready", resolve));
  await new Promise((resolve) => preview.server.listen(0, resolve));
  baseUrl = `http://localhost:${preview.server.address().port}`;
});

after(async () => {
  await preview.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("GET / serves the rendered preview page", async () => {
  const res = await fetch(`${baseUrl}/`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type"), /text\/html/);
  const body = await res.text();
  assert.match(body, /<h1>Jane Doe<\/h1>/);
  assert.match(body, /reload-client\.js/);
});

test("GET / re-renders on every request (picks up edits)", async () => {
  fs.writeFileSync(mdPath, "# Edited Name\n");
  const body = await (await fetch(`${baseUrl}/`)).text();
  assert.match(body, /<h1>Edited Name<\/h1>/);
});

test("GET /style.css serves the stylesheet", async () => {
  const res = await fetch(`${baseUrl}/style.css`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type"), /text\/css/);
  assert.match(await res.text(), /--a4-width/);
});

test("GET /reload-client.js serves the reload script", async () => {
  const res = await fetch(`${baseUrl}/reload-client.js`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type"), /javascript/);
});

test("unknown paths return 404 (no arbitrary file serving)", async () => {
  for (const url of ["/nope", "/server.js", "/../package.json"]) {
    const res = await fetch(`${baseUrl}${url}`);
    assert.equal(res.status, 404, url);
    await res.text();
  }
});

test("changing the watched markdown sends 'reload' over the websocket", async () => {
  const ws = new WebSocket(baseUrl.replace("http", "ws"));
  await new Promise((resolve, reject) => {
    ws.once("open", resolve);
    ws.once("error", reject);
  });

  const message = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("no reload message within 5s")), 5000);
    ws.once("message", (data) => {
      clearTimeout(timer);
      resolve(data.toString());
    });
  });

  fs.appendFileSync(mdPath, "\n* new bullet\n");
  assert.equal(await message, "reload");
  ws.close();
});
