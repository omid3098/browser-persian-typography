const fs = require("node:fs")
const path = require("node:path")
const assert = require("node:assert/strict")
const root = path.resolve(__dirname, "..")
// The distributable contains exactly these files; repository/development files aren't shipped.
const files = ["manifest.json", "background.js", "settings.js", "direction.js", "content.js", "fonts/Vazirmatn.woff2", "fonts/OFL.txt", "icons/on.png", "icons/off.png", "LICENSE"]
const bytes = files.reduce((sum, file) => sum + fs.statSync(path.join(root, file)).size, 0)
console.log(`Package: ${bytes} bytes / 300000 bytes (uncompressed; includes font licence)`)
assert(bytes <= 300000, "Extension exceeds its size budget")
const unpacked = path.join(root, ".agent-work/engine/unpacked")
for (const file of files) {
  const target = path.join(unpacked, file)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.copyFileSync(path.join(root, file), target)
}
console.log(`Ready-to-load distribution: ${unpacked}`)
module.exports = { files, bytes }
