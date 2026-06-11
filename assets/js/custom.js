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

  let hideTimer;

  const showTurnstileModal = () => {
    window.clearTimeout(hideTimer);
    document.body?.classList.add(activeClass);
  };

  const hideTurnstileModal = (clearContainer = true) => {
    document.body?.classList.remove(activeClass);
    if (clearContainer) {
      getCaptchaContainer()?.replaceChildren();
    }
  };

  const scheduleHideTurnstileModal = (clearContainer = true) => {
    window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => hideTurnstileModal(clearContainer), 600);
  };

  const syncTurnstileModal = () => {
    const container = getCaptchaContainer();
    if (!container) return;

    const hasFrame = Boolean(container.querySelector('iframe'));
    const hasToken = Boolean(container.querySelector('input[name="cf-turnstile-response"]')?.value);

    if (hasFrame && !hasToken) {
      showTurnstileModal();
      return;
    }

    if (hasToken) {
      scheduleHideTurnstileModal(true);
      return;
    }

    if (!container.children.length) {
      document.body?.classList.remove(activeClass);
    }
  };

  const observeCaptchaContainer = (container) => {
    if (!container || container.__walineTurnstileObserved) return;

    const observer = new MutationObserver(syncTurnstileModal);
    observer.observe(container, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ['value'],
    });

    container.__walineTurnstileObserved = true;
    syncTurnstileModal();
  };

  const observeWaline = () => {
    const container = getCaptchaContainer();
    if (container) {
      observeCaptchaContainer(container);
      return;
    }

    const observer = new MutationObserver(() => {
      const captchaContainer = getCaptchaContainer();
      if (!captchaContainer) return;

      observeCaptchaContainer(captchaContainer);
      observer.disconnect();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  };

  const patchTurnstile = (turnstile) => {
    if (!turnstile || turnstile.__walineTurnstilePatched) return turnstile;

    const originalRender = turnstile.render?.bind(turnstile);
    if (typeof originalRender !== 'function') return turnstile;

    turnstile.render = (target, options = {}) => {
      showTurnstileModal();

      let widgetId;
      const cleanup = () => {
        if (widgetId != null && typeof turnstile.remove === 'function') {
          try {
            turnstile.remove(widgetId);
          } catch (_) {}
        }
        scheduleHideTurnstileModal(true);
      };

      widgetId = originalRender(target, {
        ...options,
        callback: (token) => {
          options.callback?.(token);
          cleanup();
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

      return widgetId;
    };

    turnstile.__walineTurnstilePatched = true;
    return turnstile;
  };

  const startPatchPolling = () => {
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if (window.turnstile) {
        window.turnstile = patchTurnstile(window.turnstile);
        window.clearInterval(timer);
      }
      if (attempts > 100) {
        window.clearInterval(timer);
      }
    }, 30);
  };

  const installTurnstileHook = () => {
    if (window.turnstile) {
      window.turnstile = patchTurnstile(window.turnstile);
      return;
    }

    let turnstileApi;
    try {
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
    } catch (_) {}
  };

  document.addEventListener('click', (event) => {
    if (event.target?.closest?.('.wl-btn.primary')) {
      startPatchPolling();
    }
  }, true);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      observeWaline();
      installTurnstileHook();
    }, { once: true });
  } else {
    observeWaline();
    installTurnstileHook();
  }
})();
