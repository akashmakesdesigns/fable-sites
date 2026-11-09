import meta from './meta.json';

// Fixed-height strip at the very top of every site: model, estimated cost, build time.
export function mountBanner(siteId) {
  const s = meta.sites[siteId] || {};
  const bar = document.createElement('div');
  bar.id = 'gen-banner';
  bar.setAttribute('role', 'note');
  bar.innerHTML = `
    <span><b>Designed and built by ${meta.model}</b></span>
    <span>Estimated API cost <b>${s.cost}</b></span>
    <span>Generation time <b>${s.time}</b></span>`;
  const css = document.createElement('style');
  css.textContent = `
    :root{--banner-h:34px}
    #gen-banner{position:fixed;inset:0 0 auto 0;height:var(--banner-h);z-index:9999;display:flex;
      align-items:center;justify-content:center;gap:28px;background:#000;color:#fff;
      font:500 12.5px/1 ui-sans-serif,system-ui,-apple-system,"Helvetica Neue",Arial,sans-serif;
      letter-spacing:.01em;white-space:nowrap;overflow:hidden;padding:0 16px}
    #gen-banner span{opacity:.78}#gen-banner b{font-weight:650;opacity:1;color:#fff}
    #gen-banner span:first-child{opacity:1}
    body{padding-top:var(--banner-h)}
    @media(max-width:640px){#gen-banner{gap:14px;font-size:10.5px}}`;
  document.head.append(css);
  document.body.prepend(bar);
}
