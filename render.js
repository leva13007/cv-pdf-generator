const fs = require("fs");
const path = require("path");
const MarkdownIt = require("markdown-it");

const md = new MarkdownIt({ html: false, linkify: true, typographer: true });

/**
 * @param {string} mdFilePath - absolute path to the .md source
 * @param {object} opts
 * @param {boolean} opts.printMode - true => strip preview-only chrome (adds body.printing class)
 * @returns {string} full HTML document string
 */
function renderPage(mdFilePath, opts = {}) {
  const mdSource = fs.readFileSync(mdFilePath, "utf8");
  const contentHtml = md.render(mdSource);

  const templatePath = path.join(__dirname, "template.html");
  const template = fs.readFileSync(templatePath, "utf8");

  return template
    .replace("<!--CONTENT-->", contentHtml)
    .replace("<!--BODY-CLASS-->", opts.printMode ? "printing" : "")
    .replace(
      "<!--RELOAD-SCRIPT-->",
      opts.printMode ? "" : '<script src="/reload-client.js"></script>'
    );
}

module.exports = { renderPage };
