(function () {
  const waline = window.config?.comment?.waline;
  if (!waline) return;

  waline.path = window.location.pathname.replace(/^\/en\//, '/');
})();

(function () {
  const waline = window.config?.comment?.waline;
  if (!waline?.turnstileKey) return;

  const activeClass = 'waline-turnstile-active';
  const getCaptchaContainer = () => document.querySelector('.wl-captcha-container');

  const showTurnstileModal = () => {
    document.body?.classList.add(activeClass);
  };

  const hideTurnstileModal = () => {
    document.body?.classList.remove(activeClass);
    getCaptchaContainer()?.replaceChildren();
  };

  const patchTurnstile = (turnstile) => {
    if (!turnstile || turnstile.__walineTurnstilePatched) return turnstile;

    const originalRender = turnstile.render?.bind(turnstile);
    if (typeof originalRender !== 'function') return turnstile;

    turnstile.render = (target, options = {}) => {
      showTurnstileModal();

      return originalRender(target, {
        ...options,
        callback: (token) => {
          options.callback?.(token);
          window.setTimeout(hideTurnstileModal, 300);
        },
        'error-callback': (...args) => {
          document.body?.classList.remove(activeClass);
          options['error-callback']?.(...args);
        },
        'expired-callback': (...args) => {
          document.body?.classList.remove(activeClass);
          options['expired-callback']?.(...args);
        },
      });
    };

    turnstile.__walineTurnstilePatched = true;
    return turnstile;
  };

  if (window.turnstile) {
    window.turnstile = patchTurnstile(window.turnstile);
    return;
  }

  let turnstileApi;
  Object.defineProperty(window, 'turnstile', {
    configurable: true,
    get() {
      return turnstileApi;
    },
    set(value) {
      turnstileApi = patchTurnstile(value);
      Object.defineProperty(window, 'turnstile', {
        configurable: true,
        writable: true,
        value: turnstileApi,
      });
    },
  });
})();
