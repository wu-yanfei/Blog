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
  let tokenTimer;
  let restoreTimer;

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

  const restoreCaptchaContainer = (clearContainer = false) => {
    window.clearInterval(tokenTimer);
    window.clearTimeout(restoreTimer);
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

  const showTurnstileModal = () => {
    window.clearTimeout(restoreTimer);
    moveCaptchaToModal();
    document.body?.classList.add(activeClass);
  };

  const hasSubmitLoading = (button) => {
    return Boolean(button?.disabled || button?.querySelector('svg'));
  };

  const startTokenWatcher = (button) => {
    window.clearInterval(tokenTimer);

    let ticks = 0;
    tokenTimer = window.setInterval(() => {
      ticks += 1;

      const container = getCaptchaContainer();
      const token = container?.querySelector('input[name="cf-turnstile-response"]')?.value
        || document.querySelector('input[name="cf-turnstile-response"]')?.value;
      const hasFrame = Boolean(container?.querySelector('iframe'));

      if (token) {
        restoreTimer = window.setTimeout(() => restoreCaptchaContainer(true), 600);
        return;
      }

      if (!hasSubmitLoading(button) && !hasFrame) {
        restoreCaptchaContainer(false);
        return;
      }

      if (ticks > 600) {
        restoreCaptchaContainer(false);
      }
    }, 200);
  };

  const waitForSubmitLoading = (button) => {
    let attempts = 0;

    const timer = window.setInterval(() => {
      attempts += 1;

      if (hasSubmitLoading(button)) {
        window.clearInterval(timer);
        showTurnstileModal();
        startTokenWatcher(button);
        return;
      }

      if (attempts > 20) {
        window.clearInterval(timer);
      }
    }, 25);
  };

  document.addEventListener('click', (event) => {
    const button = event.target?.closest?.('.wl-btn.primary');
    if (!button) return;

    waitForSubmitLoading(button);
  }, false);
})();
