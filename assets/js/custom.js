(() => {
  const waline = window.config?.comment?.waline;
  if (!waline) return;

  waline.path = window.location.pathname.replace(/^\/en\//, '/');

  const turnstileKey = waline.turnstileKey;
  if (!turnstileKey) return;

  delete waline.turnstileKey;

  const activeClass = 'waline-turnstile-active';
  const isEnglish = window.location.pathname.startsWith('/en/');
  const labels = isEnglish
    ? {
        title: 'Security verification',
        hint: 'The comment will be submitted automatically after verification.',
        close: 'Cancel verification',
      }
    : {
        title: '安全验证',
        hint: '验证完成后会自动提交评论。',
        close: '取消验证',
      };

  let modal;
  let mount;
  let widgetId;
  let verifiedSubmit = false;
  let pendingTurnstileToken = '';
  let rejectVerification;

  const ensureModal = () => {
    if (modal) return;

    modal = document.createElement('div');
    modal.className = 'waline-turnstile-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', labels.title);

    const card = document.createElement('div');
    card.className = 'waline-turnstile-card';

    const close = document.createElement('button');
    close.className = 'waline-turnstile-close';
    close.type = 'button';
    close.title = labels.close;
    close.setAttribute('aria-label', labels.close);
    close.textContent = '×';
    close.addEventListener('click', cancelVerification);

    const title = document.createElement('div');
    title.className = 'waline-turnstile-title';
    title.textContent = labels.title;

    mount = document.createElement('div');
    mount.className = 'waline-turnstile-mount';

    const hint = document.createElement('div');
    hint.className = 'waline-turnstile-hint';
    hint.textContent = labels.hint;

    card.append(close, title, mount, hint);
    modal.append(card);
    document.body.append(modal);
  };

  const openModal = () => {
    ensureModal();
    document.body.classList.add(activeClass);
  };

  const closeModal = () => {
    document.body.classList.remove(activeClass);

    if (window.turnstile && widgetId !== undefined) {
      try {
        window.turnstile.remove(widgetId);
      } catch (_) {}
    }

    widgetId = undefined;
    mount?.replaceChildren();
  };

  function cancelVerification() {
    const reject = rejectVerification;
    rejectVerification = undefined;
    closeModal();
    reject?.(new Error('Turnstile verification cancelled.'));
  }

  const loadTurnstile = () => new Promise((resolve, reject) => {
    if (window.turnstile) {
      window.turnstile.ready(() => resolve(window.turnstile));
      return;
    }

    let script = document.querySelector('script[src*="challenges.cloudflare.com/turnstile/"]');
    if (!script) {
      script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      document.head.append(script);
    }

    script.addEventListener('load', () => {
      window.turnstile?.ready(() => resolve(window.turnstile));
    }, { once: true });
    script.addEventListener('error', () => reject(new Error('Failed to load Turnstile.')), { once: true });
  });

  const verifyTurnstile = async () => {
    openModal();

    const turnstile = await loadTurnstile();

    return new Promise((resolve, reject) => {
      rejectVerification = reject;

      widgetId = turnstile.render(mount, {
        sitekey: turnstileKey,
        action: 'social',
        size: 'normal',
        language: isEnglish ? 'en' : 'zh-CN',
        callback: (token) => {
          rejectVerification = undefined;
          closeModal();
          resolve(token);
        },
        'error-callback': () => {
          rejectVerification = undefined;
          closeModal();
          reject(new Error('Turnstile verification failed.'));
        },
        'expired-callback': () => {
          rejectVerification = undefined;
          closeModal();
          reject(new Error('Turnstile verification expired.'));
        },
      });
    });
  };

  const patchWalineRequest = () => {
    if (window.__walineTurnstileFetchPatched) return;

    const nativeFetch = window.fetch.bind(window);

    window.fetch = (input, init = {}) => {
      const url = typeof input === 'string' ? input : input?.url;
      const method = (init.method || input?.method || 'GET').toUpperCase();

      if (
        pendingTurnstileToken &&
        typeof url === 'string' &&
        url.startsWith(waline.serverURL) &&
        url.includes('/api/comment') &&
        (method === 'POST' || method === 'PUT') &&
        typeof init.body === 'string'
      ) {
        try {
          const body = JSON.parse(init.body);
          body.turnstile = pendingTurnstileToken;
          init = { ...init, body: JSON.stringify(body) };
          pendingTurnstileToken = '';
        } catch (_) {}
      }

      return nativeFetch(input, init);
    };

    window.__walineTurnstileFetchPatched = true;
  };

  const submitAfterVerification = async (button) => {
    try {
      pendingTurnstileToken = await verifyTurnstile();
      verifiedSubmit = true;
      button.click();
      window.setTimeout(() => {
        pendingTurnstileToken = '';
      }, 10000);
    } catch (_) {}
  };

  patchWalineRequest();

  document.addEventListener('click', (event) => {
    const button = event.target?.closest?.('.wl-btn.primary');
    if (!button) return;

    if (verifiedSubmit) {
      verifiedSubmit = false;
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    submitAfterVerification(button);
  }, true);
})();
