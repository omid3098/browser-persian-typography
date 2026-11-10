const fs = require("node:fs")
const path = require("node:path")
const root = path.resolve(__dirname, "..")
const dist = path.join(root, "dist")
const files = ["manifest.json", "background.js", "settings.js", "direction.js", "content.js", "shadow-roots.js", "fonts/Vazirmatn.woff2", "fonts/OFL.txt", "icons/on.png", "icons/off.png", "LICENSE", "popup/popup.html", "popup/popup.css", "popup/popup.js", "popup/persian-check.js", "popup/font-list.js", "popup/font-check.html", "popup/font-check.js"]
function build() {
  for (const file of files) {
    const target = path.join(dist, file)
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.copyFileSync(path.join(root, file), target)
  }
  console.log(`Ready to load: ${dist}`)
}
if (require.main === module) build()
module.exports = { build, dist, files }
