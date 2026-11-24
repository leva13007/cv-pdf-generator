const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { exportPdf, defaultPdfPath } = require("../export-pdf");

// Launches real headless Chrome — slower than the other suites.

let tmpDir;

before(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cv-export-"));
});

after(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

/** Reads page count and size from the PDF's page objects. */
function inspectPdf(file) {
  const raw = fs.readFileSync(file).toString("latin1");
  const pages = raw.match(/\/Type\s*\/Page(?!s)/g) || [];
  const box = raw.match(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/);
  return {
    header: raw.slice(0, 5),
    pageCount: pages.length,
    size: box && [Number(box[1]), Number(box[2])],
  };
}

test("defaultPdfPath puts <name>.pdf next to the source", () => {
  assert.equal(defaultPdfPath("/a/b/cv_BE.md"), "/a/b/cv_BE.pdf");
});

test("exports a one-page A4 PDF", async () => {
  const out = path.join(tmpDir, "sample.pdf");
  const written = await exportPdf(path.join(__dirname, "fixtures", "sample.md"), out);
  assert.equal(written, out);

  const pdf = inspectPdf(out);
  assert.equal(pdf.header, "%PDF-");
  assert.equal(pdf.pageCount, 1);
  // A4 = 595.28 x 841.89 pt
  assert.ok(Math.abs(pdf.size[0] - 595.28) < 1, `width ${pdf.size[0]}`);
  assert.ok(Math.abs(pdf.size[1] - 841.89) < 1, `height ${pdf.size[1]}`);
});

test("content longer than A4 overflows onto a second page", async () => {
  const mdPath = path.join(tmpDir, "long.md");
  const bullets = Array.from({ length: 120 }, (_, i) => `* Achievement number ${i + 1}`).join("\n");
  fs.writeFileSync(mdPath, `# Jane Doe\n## Engineer\n\n## Experience\n\n${bullets}\n`);

  const out = await exportPdf(mdPath);
  assert.equal(out, path.join(tmpDir, "long.pdf"));
  assert.ok(inspectPdf(out).pageCount >= 2);
});

test("every committed CV variant fits on one page", async () => {
  const root = path.join(__dirname, "..");
  const variants = [
    ...fs.readdirSync(root).filter((f) => /^cv.*\.md$/.test(f)),
    "examples/cv.example.md", // the README screenshot is taken from this one
  ];

  for (const file of variants) {
    const out = await exportPdf(path.join(root, file), path.join(tmpDir, `${path.basename(file)}.pdf`));
    assert.equal(inspectPdf(out).pageCount, 1, `${file} spills onto page 2`);
  }
});
