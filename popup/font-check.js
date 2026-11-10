import { fontsThatDrawPersian } from "./font-list.js"

chrome.runtime.onMessage.addListener((message, _sender, respond) => {
  if (message.type !== "check-persian-fonts") return
  fontsThatDrawPersian(message.families).then(
    families => respond({ families: [...families] }),
    error => respond({ error: error.message })
  )
  return true
})
