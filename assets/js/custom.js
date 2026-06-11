(() => {
  const waline = window.config?.comment?.waline;
  if (!waline) return;

  waline.path = window.location.pathname.replace(/^\/en\//, '/');
  if (!waline.turnstileKey) return;

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
  let placeholder;
  let watchTimer;
  let restoreTimer;
  let resolveTurnstile;
  let verificationCancelled = false;

  const isSubmitting = (button) => Boolean(button?.disabled || button?.querySelector('svg'));
  const getCaptchaContainer = () => document.querySelector('.wl-captcha-container');

  const finishPendingTurnstile = (token = '__waline_cancelled__') => {
    if (!resolveTurnstile) return false;

    const resolve = resolveTurnstile;
    resolveTurnstile = null;
    resolve(token);
    return true;
  };

  const restoreCaptcha = (clear = false) => {
    window.clearInterval(watchTimer);
    window.clearTimeout(restoreTimer);
    document.body.classList.remove(activeClass);

    const container = getCaptchaContainer();
    if (container && clear) container.replaceChildren();

    if (container && placeholder?.parentNode) {
      placeholder.parentNode.insertBefore(container, placeholder);
      placeholder.remove();
    }
    placeholder = null;
  };

  const cancelVerification = () => {
    verificationCancelled = true;
    finishPendingTurnstile();
    restoreCaptcha(true);
  };

  const forceTurnstileNormalSize = () => {
    const patch = () => {
      const turnstile = window.turnstile;
      if (!turnstile || turnstile.__walineNormalSizePatched || typeof turnstile.render !== 'function') return false;

      const render = turnstile.render.bind(turnstile);
      turnstile.render = (target, options = {}) => {
        if (verificationCancelled) {
          verificationCancelled = false;
          window.setTimeout(() => options.callback?.('__waline_cancelled__'), 0);
          return null;
        }

        resolveTurnstile = (token) => options.callback?.(token);

        return render(target, {
          ...options,
          size: 'normal',
          language: isEnglish ? 'en' : 'zh-CN',
          callback: (token) => {
            resolveTurnstile = null;
            options.callback?.(token);
          },
          'error-callback': (...args) => {
            finishPendingTurnstile();
            options['error-callback']?.(...args);
          },
          'expired-callback': (...args) => {
            finishPendingTurnstile();
            options['expired-callback']?.(...args);
          },
        });
      };
      turnstile.__walineNormalSizePatched = true;
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
    close.setAttribute('aria-label', labels.close);
    close.title = labels.close;
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

  const openCaptchaModal = (button) => {
    const container = getCaptchaContainer();
    if (!container) return;

    verificationCancelled = false;
    window.clearTimeout(restoreTimer);
    ensureModal();

    if (!placeholder && container.parentNode !== mount) {
      placeholder = document.createComment('waline captcha placeholder');
      container.parentNode?.insertBefore(placeholder, container);
    }

    mount.append(container);
    document.body.classList.add(activeClass);

    let ticks = 0;
    window.clearInterval(watchTimer);
    watchTimer = window.setInterval(() => {
      const token = container.querySelector('input[name="cf-turnstile-response"]')?.value;

      if (token) {
        resolveTurnstile = null;
        restoreTimer = window.setTimeout(() => restoreCaptcha(true), 600);
        return;
      }

      if (!isSubmitting(button)) {
        restoreCaptcha(false);
        return;
      }

      if (++ticks > 600) {
        cancelVerification();
      }
    }, 200);
  };

  const waitForSubmit = (button) => {
    let attempts = 0;
    const timer = window.setInterval(() => {
      if (isSubmitting(button)) {
        window.clearInterval(timer);
        openCaptchaModal(button);
        return;
      }

      if (++attempts > 20) window.clearInterval(timer);
    }, 25);
  };

  forceTurnstileNormalSize();

  document.addEventListener('click', (event) => {
    const button = event.target?.closest?.('.wl-btn.primary');
    if (button) waitForSubmit(button);
  });
})();
