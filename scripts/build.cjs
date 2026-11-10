const fs = require("node:fs")
const path = require("node:path")
const root = path.resolve(__dirname, "..")
const dist = path.join(root, "dist")
const files = ["manifest.json", "background.js", "settings.js", "direction.js", "content.js", "shadow-roots.js", "fonts/Vazirmatn.woff2", "fonts/OFL.txt", "icons/toolbar-on-16.png", "icons/toolbar-on-32.png", "icons/toolbar-off-16.png", "icons/toolbar-off-32.png", "icons/icon-48.png", "icons/icon-128.png", "LICENSE", "popup/popup.html", "popup/popup.css", "popup/popup.js", "popup/persian-check.js", "popup/font-list.js", "popup/font-check.html", "popup/font-check.js"]
function build() {
  fs.rmSync(dist, { recursive: true, force: true })
  for (const file of files) {
    const target = path.join(dist, file)
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.copyFileSync(path.join(root, file), target)
  }
  console.log(`Ready to load: ${dist}`)
}
if (require.main === module) build()
module.exports = { build, dist, files }
