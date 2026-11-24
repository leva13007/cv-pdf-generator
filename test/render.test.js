const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const { renderPage } = require("../render");

const SAMPLE = path.join(__dirname, "fixtures", "sample.md");

test("injects rendered markdown into the template", () => {
  const html = renderPage(SAMPLE);
  assert.match(html, /<h1>Jane Doe<\/h1>/);
  assert.match(html, /<li>Shipped the thing<\/li>/);
  assert.doesNotMatch(html, /<!--CONTENT-->/);
  assert.doesNotMatch(html, /<!--BODY-CLASS-->/);
  assert.doesNotMatch(html, /<!--RELOAD-SCRIPT-->/);
});

test("preview mode includes the live-reload script and no printing class", () => {
  const html = renderPage(SAMPLE, { printMode: false });
  assert.match(html, /<script src="\/reload-client\.js"><\/script>/);
  assert.match(html, /<body class="">/);
});

test("print mode adds body.printing and omits the reload script", () => {
  const html = renderPage(SAMPLE, { printMode: true });
  assert.match(html, /<body class="printing">/);
  assert.doesNotMatch(html, /reload-client\.js/);
});

test("subtitle h2 is the second child of .page-content (style.css relies on h2:nth-child(2))", () => {
  const html = renderPage(SAMPLE);
  const content = html.split('<div class="page-content">')[1];
  const tags = [...content.matchAll(/<(\w+)[\s>]/g)].map((m) => m[1]);
  assert.deepEqual(tags.slice(0, 2), ["h1", "h2"]);
});

test("job dates in h3 render as <em> (pushed right by the flex layout)", () => {
  const html = renderPage(SAMPLE);
  assert.match(html, /<h3>Senior Engineer — Acme Corp <em>Jan 2022 – Present<\/em><\/h3>/);
});

test("raw HTML in markdown is escaped, not rendered", () => {
  const html = renderPage(SAMPLE);
  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /&lt;script&gt;alert/);
});

test("linkify and typographer are enabled", () => {
  const html = renderPage(SAMPLE);
  assert.match(html, /<a href="mailto:jane@example\.com">jane@example\.com<\/a>/);
  assert.match(html, /“a lot”/);
  assert.match(html, /–/); // "--" -> en dash
});

test("throws on a missing markdown file", () => {
  assert.throws(() => renderPage(path.join(__dirname, "fixtures", "nope.md")), /ENOENT/);
});
