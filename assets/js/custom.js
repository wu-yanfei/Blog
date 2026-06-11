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
      }
    : {
        title: '安全验证',
        hint: '验证完成后会自动提交评论。',
      };

  let modal;
  let mount;
  let placeholder;
  let watchTimer;
  let restoreTimer;

  const forceTurnstileNormalSize = () => {
    const patch = () => {
      const turnstile = window.turnstile;
      if (!turnstile || turnstile.__walineNormalSizePatched || typeof turnstile.render !== 'function') return false;

      const render = turnstile.render.bind(turnstile);
      turnstile.render = (target, options = {}) => render(target, {
        ...options,
        size: 'normal',
      });
      turnstile.__walineNormalSizePatched = true;
      return true;
    };

    if (patch() || window.__walineTurnstileScriptPatched) return;

    const appendChild = Node.prototype.appendChild;
    Node.prototype.appendChild = function (node) {
      if (node instanceof HTMLScriptElement && node.src.includes('challenges.cloudflare.com/turnstile/')) {
        node.addEventListener('load', patch, { once: true });
      }
      return appendChild.call(this, node);
    };

    window.__walineTurnstileScriptPatched = true;
  };

  const isSubmitting = (button) => Boolean(button?.disabled || button?.querySelector('svg'));
  const getCaptchaContainer = () => document.querySelector('.wl-captcha-container');

  const ensureModal = () => {
    if (modal) return;

    modal = document.createElement('div');
    modal.className = 'waline-turnstile-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', labels.title);

    const card = document.createElement('div');
    card.className = 'waline-turnstile-card';

    const title = document.createElement('div');
    title.className = 'waline-turnstile-title';
    title.textContent = labels.title;

    mount = document.createElement('div');
    mount.className = 'waline-turnstile-mount';

    const hint = document.createElement('div');
    hint.className = 'waline-turnstile-hint';
    hint.textContent = labels.hint;

    card.append(title, mount, hint);
    modal.append(card);
    document.body.append(modal);
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

  const openCaptchaModal = (button) => {
    const container = getCaptchaContainer();
    if (!container) return;

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
        restoreTimer = window.setTimeout(() => restoreCaptcha(true), 600);
        return;
      }

      if (!isSubmitting(button) || ++ticks > 600) {
        restoreCaptcha(false);
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
