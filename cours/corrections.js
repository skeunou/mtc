/* Mode correction — Mes cours MTC
   Bouton ✏️ : rend le texte modifiable, garde les changements (brouillon local),
   puis prépare la liste « avant / après » à coller dans la conversation avec Claude. */
(function () {
  var SEL = 'h1,h2,h3,p,li,td,th,figcaption,.quote,.box,.rules>div,.gt,.gtt,.gcm,.gpz,.ct,.cnote,.cs,.legend span,.d,.t';
  var KEY = 'mtc-corr:' + location.pathname;
  var on = false, blocks = [], orig = {};

  function store(get, val) {
    try { if (get) return JSON.parse(localStorage.getItem(KEY) || 'null'); localStorage.setItem(KEY, JSON.stringify(val)); }
    catch (e) { return null; }
  }
  function clean(t) { return (t || '').replace(/\s+/g, ' ').trim(); }

  function collect() {
    var root = document.querySelector('main') || document.body;
    var all = Array.prototype.slice.call(root.querySelectorAll(SEL));
    blocks = all.filter(function (el) {
      if (el.closest('.printonly,.toc,footer,header.bar,#corr-ui')) return false;
      if (el.querySelector(SEL)) return false;            // garder les éléments « feuilles »
      return clean(el.innerText).length > 0;
    });
    blocks.forEach(function (el, i) { el.setAttribute('data-cid', i); if (!(i in orig)) orig[i] = clean(el.innerText); });
  }
  function section(el) {
    var h = null, n = el;
    var heads = document.querySelectorAll('main h2');
    for (var i = 0; i < heads.length; i++) {
      if (heads[i].compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) h = heads[i]; else break;
    }
    var row = el.closest('tr'), num = row && row.querySelector('td.n');
    var card = el.closest('.cc,.gc'), cn = card && card.querySelector('.cn,.gn');
    var s = h ? clean(h.innerText) : '';
    if (num) s += ' · étape ' + clean(num.innerText);
    else if (cn) s += ' · étape ' + clean(cn.innerText);
    return s;
  }
  function changes() {
    var out = [];
    blocks.forEach(function (el) {
      var i = el.getAttribute('data-cid'), now = clean(el.innerText);
      if (now !== orig[i]) out.push({ i: i, where: section(el), avant: orig[i], apres: now });
    });
    return out;
  }
  function save() {
    var c = changes(), m = {};
    c.forEach(function (x) { m[x.i] = x.apres; });
    store(false, { edits: m, note: (document.getElementById('corr-note') || {}).value || '' });
    count();
  }
  function count() {
    var b = document.getElementById('corr-count');
    if (b) { var n = changes().length; b.textContent = n ? n + ' modif.' : ''; }
  }
  function restore() {
    var d = store(true); if (!d || !d.edits) return;
    Object.keys(d.edits).forEach(function (i) {
      var el = document.querySelector('[data-cid="' + i + '"]');
      if (el && clean(el.innerText) !== d.edits[i]) { el.innerText = d.edits[i]; el.classList.add('corr-done'); }
    });
    var n = document.getElementById('corr-note'); if (n && d.note) n.value = d.note;
  }
  function toggle() {
    on = !on;
    document.body.classList.toggle('corr-on', on);
    collect();
    blocks.forEach(function (el) {
      if (on) { el.setAttribute('contenteditable', 'true'); el.setAttribute('spellcheck', 'true'); }
      else { el.removeAttribute('contenteditable'); }
    });
    document.getElementById('corr-panel').style.display = 'none';
    document.getElementById('corr-open').style.display = on ? 'inline-block' : 'none';
    document.getElementById('corr-btn').textContent = on ? '✓ Terminer' : '✏️ Corriger';
    if (on) restore();
    count();
  }
  function report() {
    var c = changes(), note = (document.getElementById('corr-note') || {}).value || '';
    var title = clean(document.title);
    var txt = 'Corrections — ' + title + '\n' + location.href + '\n';
    if (!c.length && !note) { txt += '\n(aucune modification)'; }
    c.forEach(function (x, k) {
      txt += '\n' + (k + 1) + '. ' + (x.where || 'en haut de page') +
        '\n   AVANT : ' + x.avant + '\n   APRÈS : ' + x.apres + '\n';
    });
    if (note) txt += '\nRemarques : ' + note + '\n';
    var box = document.getElementById('corr-out');
    box.value = txt; box.style.display = 'block'; box.select();
    var done = function () { document.getElementById('corr-msg').textContent = 'Copié ! Colle-le dans la conversation avec Claude.'; };
    try { navigator.clipboard.writeText(txt).then(done, function () { document.execCommand('copy'); done(); }); }
    catch (e) { try { document.execCommand('copy'); done(); } catch (e2) {} }
  }
  function reset() {
    if (!confirm('Effacer tes corrections sur cette page ?')) return;
    store(false, null);
    blocks.forEach(function (el) { var i = el.getAttribute('data-cid'); if (clean(el.innerText) !== orig[i]) el.innerText = orig[i]; el.classList.remove('corr-done'); });
    var n = document.getElementById('corr-note'); if (n) n.value = '';
    document.getElementById('corr-out').style.display = 'none';
    document.getElementById('corr-msg').textContent = '';
    count();
  }

  function ui() {
    var css = document.createElement('style');
    css.textContent =
      '#corr-ui{position:fixed;right:14px;bottom:14px;z-index:999;font-family:"DM Sans",sans-serif}' +
      '#corr-open{background:#38bdf8;color:#000;border:none;border-radius:22px;padding:10px 14px;font:700 14px "DM Sans",sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.4);cursor:pointer;margin-right:4px}' +
      '#corr-btn{background:#e8ff47;color:#000;border:none;border-radius:22px;padding:10px 16px;font:700 14px "DM Sans",sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.4);cursor:pointer}' +
      '#corr-count{display:inline-block;margin-left:6px;font-size:12px;color:#000;background:#fff;border-radius:10px;padding:0 6px}' +
      '#corr-count:empty{display:none}' +
      '#corr-panel{display:none;position:absolute;right:0;bottom:52px;width:min(340px,88vw);background:#141416;border:1px solid #2a2a30;border-radius:12px;padding:12px;color:#f0f0f0;font-size:13px;box-shadow:0 10px 30px rgba(0,0,0,.5)}' +
      '#corr-panel b{display:block;margin-bottom:4px}' +
      '#corr-panel p{font-size:12.5px;color:#a0a0aa;margin:0 0 8px;line-height:1.4}' +
      '#corr-panel textarea{width:100%;background:#0d0d0f;color:#f0f0f0;border:1px solid #2a2a30;border-radius:8px;padding:6px;font:12.5px "DM Sans",sans-serif;margin:4px 0}' +
      '#corr-panel button{border:1px solid #2a2a30;background:#1c1c20;color:#f0f0f0;border-radius:8px;padding:7px 10px;font:600 12.5px "DM Sans",sans-serif;margin:4px 4px 0 0;cursor:pointer}' +
      '#corr-panel button.go{background:#38bdf8;color:#000;border-color:#38bdf8}' +
      '#corr-out{display:none;height:120px}#corr-msg{color:#4ade80;font-size:12px;margin-top:4px}' +
      'body.corr-on [contenteditable]{outline:1px dashed rgba(232,255,71,.35);outline-offset:2px;border-radius:3px;cursor:text}' +
      'body.corr-on [contenteditable]:focus{outline:2px solid #e8ff47;background:rgba(232,255,71,.06)}' +
      'body.corr-on .corr-done,body.corr-on [contenteditable].corr-done{box-shadow:inset 3px 0 0 #e8ff47}' +
      '@media print{#corr-ui{display:none!important}body.corr-on [contenteditable]{outline:none!important;background:none!important;box-shadow:none!important}}';
    document.head.appendChild(css);
    var d = document.createElement('div'); d.id = 'corr-ui';
    d.innerHTML =
      '<div id="corr-panel"><b>Mode correction</b>' +
      '<p>Ajoute une remarque si besoin, puis « Envoyer à Claude » : la liste avant/après est copiée, colle-la dans la conversation.</p>' +
      '<textarea id="corr-note" rows="2" placeholder="Remarque générale (facultatif) : ex. schéma de l\'étape 4 faux…"></textarea>' +
      '<button class="go" id="corr-send">📋 Envoyer à Claude</button><button id="corr-reset">Tout annuler</button>' +
      '<textarea id="corr-out" readonly></textarea><div id="corr-msg"></div></div>' +
      '<button id="corr-open" style="display:none">📋 Envoyer</button> <button id="corr-btn">✏️ Corriger</button><span id="corr-count"></span>';
    document.body.appendChild(d);
    document.getElementById('corr-btn').onclick = toggle;
    document.getElementById('corr-open').onclick = function () { var p = document.getElementById('corr-panel'); p.style.display = p.style.display === 'block' ? 'none' : 'block'; };
    document.getElementById('corr-send').onclick = function () { save(); report(); };
    document.getElementById('corr-reset').onclick = reset;
    document.getElementById('corr-note').oninput = save;
    document.addEventListener('input', function (e) {
      if (on && e.target.closest && e.target.closest('[contenteditable]')) { e.target.closest('[contenteditable]').classList.add('corr-done'); save(); }
    });
    // badge visible même hors mode correction si un brouillon existe
    collect(); var dr = store(true);
    if (dr && dr.edits && Object.keys(dr.edits).length) document.getElementById('corr-count').textContent = Object.keys(dr.edits).length + ' modif.';
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ui); else ui();
})();
