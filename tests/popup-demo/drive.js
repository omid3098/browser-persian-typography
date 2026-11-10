// Opens the view a state asks for with real clicks, and marks the moments the budgets are measured at.
const name = location.hash.slice(1)
const app = document.getElementById("app")
// Two frames; a screenshot tool that runs the page on a virtual clock may never deliver them, so a timer ends the wait.
const frame = () => new Promise(resolve => {
  requestAnimationFrame(() => requestAnimationFrame(resolve))
  setTimeout(resolve, 100)
})
const until = test => new Promise(resolve => {
  const look = () => { const found = test(); if (found) resolve(found); else setTimeout(look, 5) }
  look()
})

document.addEventListener("click", () => { window.__clickedAt = performance.now() }, true)
const main = await until(() => app.querySelector('[data-view="main"]'))
await frame()
window.__mainAt = performance.now()
document.documentElement.dataset.mainAt = String(Math.round(window.__mainAt))

if (name.startsWith("font")) {
  const buttons = [...main.querySelectorAll(".brow")]
  buttons[0].click()
  const list = await until(() => app.querySelector('[data-view="font"] .flist:not([aria-busy])'))
  await frame()
  window.__fontAt = performance.now()
  if (name === "font-pointer") {
    const row = [...list.querySelectorAll(".frow")].find(button => button.textContent.includes("Arial") && !button.textContent.includes("Black"))
    row.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }))
  }
} else if (name === "sites") {
  main.querySelectorAll(".brow")[1].click()
}
delete document.documentElement.dataset.driving
