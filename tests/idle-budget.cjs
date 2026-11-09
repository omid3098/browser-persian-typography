const { spawn } = require("node:child_process")
const { start } = require("./harness.cjs")
;(async () => {
  const h = await start("idle")
  try {
    await h.open("chat")
    await h.page.waitForLoadState("networkidle")
    const client = await h.context.browser().newBrowserCDPSession()
    const { processInfo } = await client.send("SystemInfo.getProcessInfo")
    const pid = processInfo.find(process => process.type === "browser").id
    await client.detach()
    const code = await new Promise((resolve, reject) => {
      const child = spawn("python", ["C:\\Users\\Omid\\.agents\\tools\\cpu_budget.py", "--pid", String(pid), "--max", "1.0"], { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] })
      child.stdout.pipe(process.stdout); child.stderr.pipe(process.stderr)
      child.on("error", reject); child.on("exit", resolve)
    })
    if (code !== 0) throw new Error(`Idle budget failed: exit ${code}`)
  } finally { await h.close() }
})().catch(error => { console.error(error); process.exitCode = 1 })
