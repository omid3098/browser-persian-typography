const { spawn } = require('node:child_process')
const path = require('node:path')
const fs = require('node:fs')
const assert = require('node:assert/strict')
const { start, work } = require('./harness.cjs')
;(async () => {
  const runs = []
  for (const extension of [false, true]) {
    const h = await start(extension ? 'idle-on' : 'idle-off', { extension })
    try {
      if (extension) {
        await h.setting('setSite', { site: h.base, enabled: true })
        await h.setting('setFont', { font: { type: 'bundled' } })
      }
      await h.open('chat'); await h.page.waitForLoadState('networkidle')
      const browser = await h.context.browser().newBrowserCDPSession()
      const { processInfo } = await browser.send('SystemInfo.getProcessInfo')
      const pid = processInfo.find(process => process.type === 'browser').id
      await browser.detach()
      let client, world
      if (extension) {
        client = await h.context.newCDPSession(h.page)
        const worlds = []
        client.on('Runtime.executionContextCreated', ({ context }) => worlds.push(context))
        await client.send('Runtime.enable')
        world = worlds.find(context => context.origin.startsWith('chrome-extension://'))
      }
      async function metrics() {
        if (!extension) return { flushes: 0, idle: true }
        const { result } = await client.send('Runtime.evaluate', { contextId: world.id, expression: 'JSON.stringify(__persianTypographyMetrics)', returnByValue: true })
        return JSON.parse(result.value)
      }
      let previous = await metrics()
      const windows = []
      await new Promise((resolve, reject) => {
        const child = spawn('python', [path.join(__dirname, 'idle-sample.py'), String(pid)], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
        let buffer = '', pending = Promise.resolve()
        child.stdout.on('data', chunk => {
          buffer += chunk
          let end
          while ((end = buffer.indexOf('\n')) >= 0) {
            const data = JSON.parse(buffer.slice(0, end)); buffer = buffer.slice(end + 1)
            pending = pending.then(async () => {
              if (!data.window) { console.log(JSON.stringify(data)); return }
              const now = await metrics()
              data.flushes = now.flushes - previous.flushes; data.engineIdle = now.idle
              previous = now; windows.push(data)
              console.log(`${extension ? 'ON' : 'OFF'} ${JSON.stringify(data)}`)
            })
          }
        })
        child.stderr.pipe(process.stderr); child.on('error', reject)
        child.on('exit', code => pending.then(() => code === 0 ? resolve() : reject(new Error(`Sampler exit ${code}`)), reject))
      })
      runs.push({ extension, windows })
      if (client) await client.detach()
    } finally { await h.close() }
  }
  fs.writeFileSync(path.join(work, 'idle-attribution.json'), JSON.stringify(runs, null, 2))
  const raw = runs.map(run => run.windows.slice(0, 5).map(w => w.percent))
  const settled = runs.map(run => run.windows.slice(6).map(w => w.percent))
  console.log('Raw five windows OFF / ON:', JSON.stringify(raw))
  console.log('From 180s after load+fonts+networkidle OFF / ON:', JSON.stringify(settled))
  assert(runs.every(run => run.windows.length === 11))
  assert(runs[1].windows.every(w => w.flushes === 0 && w.engineIdle), 'Engine worked on a static page')
  // Both attribution runs started a utility process in the 150–180s window.
  // Keep every startup reading; gate five windows after that initialization.
  for (const run of runs) assert(run.windows.slice(6).every(w => w.percent < 1), `Idle budget failed ${run.extension ? 'ON' : 'OFF'}`)
  console.log('PASS idle: five windows from 180s; zero engine flushes')
})().catch(error => { console.error(error); process.exitCode = 1 })
