// Le pont Android fournit la hauteur réelle de la barre d’état et de la caméra.
(() => {
  const cap = window.Capacitor;
  if (!cap?.isNativePlatform?.() || cap.getPlatform?.() !== 'android' || !cap.isPluginAvailable?.('LcmcSystemBars')) return;
  const root = document.documentElement;
  const bars = cap.Plugins?.LcmcSystemBars || cap.registerPlugin('LcmcSystemBars');
  root.classList.add('lcmc-native-edge-to-edge');
  root.style.setProperty('--lcmc-safe-top', 'max(24px, env(safe-area-inset-top, 0px))');
  let safeTop = 24;
  let lightIcons = null;
  let styleFrame;
  function refreshStyle() {
    const header = document.querySelector('.compact-header');
    const rect = header?.getBoundingClientRect();
    const overPhoto = !!rect && rect.bottom > rect.height * .32 + safeTop;
    const next = overPhoto || !!document.querySelector('dialog[open]');
    if (next === lightIcons) return;
    lightIcons = next;
    bars.setStyle({ lightIcons: next }).catch(() => { lightIcons = null; });
  }
  function scheduleStyle() { cancelAnimationFrame(styleFrame); styleFrame = requestAnimationFrame(refreshStyle); }
  function apply(insets) {
    const top = Number(insets?.top);
    if (Number.isFinite(top) && top >= 0) {
      safeTop = top;
      root.style.setProperty('--lcmc-safe-top', `${top}px`);
      scheduleStyle();
    }
  }
  function refresh() { bars.getInsets().then(apply).catch(() => {}); }
  // Écouter avant de lire : une rotation ou l’ouverture du clavier peut changer les bords.
  bars.addListener('insetsChanged', apply).then(refresh).catch(refresh);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
  let resizeFrame;
  window.addEventListener('resize', () => { cancelAnimationFrame(resizeFrame); resizeFrame = requestAnimationFrame(refresh); }, { passive: true });
  window.addEventListener('scroll', scheduleStyle, { passive: true });
  new MutationObserver(scheduleStyle).observe(document.body, { attributes: true, attributeFilter: ['open'], subtree: true });
})();
