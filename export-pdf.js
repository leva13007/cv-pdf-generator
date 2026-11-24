const http = require("http");
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");
const { renderPage } = require("./render");

/** cv_BE.md -> cv_BE.pdf in the same directory */
function defaultPdfPath(inputMdPath) {
  return path.join(path.dirname(inputMdPath), path.basename(inputMdPath, ".md") + ".pdf");
}

/**
 * Renders a markdown file in print mode and writes an A4 PDF.
 * @param {string} inputMdPath - absolute path to the .md source
 * @param {string} [outputPdfPath] - defaults to <name>.pdf next to the source
 * @returns {Promise<string>} the path the PDF was written to
 */
async function exportPdf(inputMdPath, outputPdfPath = defaultPdfPath(inputMdPath)) {
  const server = http.createServer((req, res) => {
    if (req.url === "/") {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(renderPage(inputMdPath, { printMode: true }));
    } else if (req.url === "/style.css") {
      res.writeHead(200, { "Content-Type": "text/css" });
      res.end(fs.readFileSync(path.join(__dirname, "style.css")));
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();

  const browser = await puppeteer.launch();
  try {
    const page = await browser.newPage();
    await page.emulateMediaType("print");
    await page.goto(`http://localhost:${port}/`, { waitUntil: "networkidle0" });

    await page.pdf({
      path: outputPdfPath,
      format: "A4",
      printBackground: true,
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
    });
  } finally {
    await browser.close();
    server.close();
  }
  return outputPdfPath;
}

module.exports = { exportPdf, defaultPdfPath };

if (require.main === module) {
  const inputMdPath = process.argv[2]
    ? path.resolve(process.argv[2])
    : path.join(__dirname, "cv.md");

  exportPdf(inputMdPath)
    .then((out) => console.log(`PDF written to ${out}`))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
