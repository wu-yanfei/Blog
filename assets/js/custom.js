(() => {
  const waline = window.config?.comment?.waline;
  if (!waline) return;

  waline.path = window.location.pathname.replace(/^\/en\//, '/');
  if (!waline.turnstileKey) return;

  const isEnglish = window.location.pathname.startsWith('/en/');

  const forceTurnstileOptions = () => {
    const patch = () => {
      const turnstile = window.turnstile;
      if (!turnstile || turnstile.__walineOptionsPatched || typeof turnstile.render !== 'function') return false;

      const render = turnstile.render.bind(turnstile);
      turnstile.render = (target, options = {}) => render(target, {
        ...options,
        size: 'normal',
        language: isEnglish ? 'en' : 'zh-CN',
      });
      turnstile.__walineOptionsPatched = true;
      return true;
    };

    if (patch() || window.__walineTurnstileScriptPatched) return;

    const appendChild = Node.prototype.appendChild;
    const restoreAppendChild = () => {
      if (Node.prototype.appendChild === patchedAppendChild) {
        Node.prototype.appendChild = appendChild;
      }
    };
    const patchedAppendChild = function (node) {
      if (node instanceof HTMLScriptElement && node.src.includes('challenges.cloudflare.com/turnstile/')) {
        node.addEventListener('load', () => {
          patch();
          restoreAppendChild();
        }, { once: true });
        node.addEventListener('error', restoreAppendChild, { once: true });
      }
      return appendChild.call(this, node);
    };

    Node.prototype.appendChild = patchedAppendChild;
    window.__walineTurnstileScriptPatched = true;
  };

  forceTurnstileOptions();
})();
