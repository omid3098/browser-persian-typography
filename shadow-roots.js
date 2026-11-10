// Runs before page scripts, in their world: attaching a root is not a DOM mutation.
;(() => {
  const notify = function () {
    this.dispatchEvent(new Event('__persianTypographyShadow', { bubbles: true, composed: true }))
  }
  const attach = Element.prototype.attachShadow
  Element.prototype.attachShadow = function (...args) {
    const root = Reflect.apply(attach, this, args)
    if (root.mode === 'open') notify.call(this)
    return root
  }
})()
