(function () {
  const waline = window.config?.comment?.waline;
  if (!waline) return;

  waline.path = window.location.pathname.replace(/^\/en\//, '/');
})();

(function () {
  const waline = window.config?.comment?.waline;
  if (!waline?.turnstileKey) return;

  const activeClass = 'waline-turnstile-active';
  const isEnglish = window.location.pathname.startsWith('/en/');

  let modal;
  let mount;
  let captchaContainer;
  let placeholder;
  let hideTimer;

  const getCaptchaContainer = () => captchaContainer || document.querySelector('.wl-captcha-container');

  const ensureModal = () => {
    if (modal) return modal;

    modal = document.createElement('div');
    modal.className = 'waline-turnstile-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', isEnglish ? 'Security verification' : '安全验证');

    const card = document.createElement('div');
    card.className = 'waline-turnstile-card';

    const title = document.createElement('div');
    title.className = 'waline-turnstile-title';
    title.textContent = isEnglish ? 'Security verification' : '安全验证';

    mount = document.createElement('div');
    mount.className = 'waline-turnstile-mount';

    const hint = document.createElement('div');
    hint.className = 'waline-turnstile-hint';
    hint.textContent = isEnglish
      ? 'The comment will be submitted automatically after verification.'
      : '验证完成后会自动提交评论。';

    card.append(title, mount, hint);
    modal.append(card);
    document.body.append(modal);

    return modal;
  };

  const moveCaptchaToModal = () => {
    ensureModal();

    const container = getCaptchaContainer();
    if (!container || !mount) return null;

    if (!placeholder && container.parentNode !== mount) {
      placeholder = document.createComment('waline captcha placeholder');
      container.parentNode?.insertBefore(placeholder, container);
    }

    mount.append(container);
    captchaContainer = container;
    return container;
  };

  const showTurnstileModal = () => {
    window.clearTimeout(hideTimer);
    moveCaptchaToModal();
    document.body?.classList.add(activeClass);
  };

  const restoreCaptchaContainer = (clearContainer = true) => {
    document.body?.classList.remove(activeClass);

    if (captchaContainer && clearContainer) {
      captchaContainer.replaceChildren();
    }

    if (captchaContainer && placeholder?.parentNode) {
      placeholder.parentNode.insertBefore(captchaContainer, placeholder);
      placeholder.remove();
    }

    placeholder = null;
  };

  const scheduleRestoreCaptchaContainer = (clearContainer = true) => {
    window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => restoreCaptchaContainer(clearContainer), 600);
  };

  const patchTurnstile = (turnstile) => {
    if (!turnstile || turnstile.__walineTurnstilePatched) return turnstile;

    const originalRender = turnstile.render?.bind(turnstile);
    if (typeof originalRender !== 'function') return turnstile;

    turnstile.render = (target, options = {}) => {
      const container = moveCaptchaToModal();
      showTurnstileModal();

      let widgetId;
      const cleanup = () => {
        if (widgetId != null && typeof turnstile.remove === 'function') {
          try {
            turnstile.remove(widgetId);
          } catch (_) {}
        }
        scheduleRestoreCaptchaContainer(true);
      };

      widgetId = originalRender(container || target, {
        ...options,
        callback: (token) => {
          options.callback?.(token);
          cleanup();
        },
        'error-callback': (...args) => {
          restoreCaptchaContainer(false);
          options['error-callback']?.(...args);
        },
        'expired-callback': (...args) => {
          restoreCaptchaContainer(false);
          options['expired-callback']?.(...args);
        },
      });

      return widgetId;
    };

    turnstile.__walineTurnstilePatched = true;
    return turnstile;
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

  document.addEventListener('click', (event) => {
    if (event.target?.closest?.('.wl-btn.primary')) {
      showTurnstileModal();
      startPatchPolling();
    }
  }, true);

  installTurnstileHook();
})();
