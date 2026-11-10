// Runs before page scripts, in their world: attaching a root is not a DOM mutation.
;(() => {
  const dispatch = EventTarget.prototype.dispatchEvent
  const ShadowEvent = Event
  const DetachedEvent = MouseEvent
  const apply = Reflect.apply
  const attach = Element.prototype.attachShadow
  Element.prototype.attachShadow = function (...args) {
    const root = apply(attach, this, args)
    if (root.mode === 'open') {
      try {
        apply(dispatch, this, [new ShadowEvent('__persianTypographyShadow', { bubbles: true, composed: true })])
        if (!this.isConnected) apply(dispatch, document, [new DetachedEvent('__persianTypographyShadow', { relatedTarget: this })])
      } catch {} // A notification must never change a successful native attachment.
    }
    return root
  }
})()
