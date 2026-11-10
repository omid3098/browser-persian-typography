// Runs in a worker: tells which of the given font families can draw every Persian letter.
// A font that cannot hands some letters to the next font in the list. With Vazirmatn behind it the text is
// as wide as with a serif behind it only when no letter was handed over.
self.onmessage = async ({ data: { probe, families, fontUrl } }) => {
  try {
    self.postMessage(await check(probe, families, fontUrl))
  } catch (error) {
    self.postMessage({ error: String(error) })
  }
}

async function check(probe, families, fontUrl) {
  const face = new FontFace("Vazirmatn", `url("${fontUrl}")`)
  await face.load()
  self.fonts.add(face)
  const context = new OffscreenCanvas(1, 1).getContext("2d")
  return families.filter(family => {
    const name = family.replace(/["\\]/g, "")
    const draws = text => {
      context.font = `32px "${name}","Vazirmatn",serif`
      const behindVazirmatn = context.measureText(text).width
      context.font = `32px "${name}",serif`
      return Math.abs(behindVazirmatn - context.measureText(text).width) < 0.01
    }
    // Reject non-Persian faces before shaping the full alphabet.
    return draws("پژگ") && draws(probe)
  })
}
