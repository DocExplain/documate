/* SPDX-FileCopyrightText: 2025 DocExpain
 * SPDX-License-Identifier: LicenseRef-SA-NC-1.0
 */
(function () {
  // util
  function normPath(p) {
    if (!p) return '/';
    if (!p.startsWith('/')) p = '/' + p;
    // normalise en dossier (avec slash final)
    if (!p.endsWith('/')) {
      // si on pointe vers un fichier .html, laisse tel quel
      if (!/\.html?$/i.test(p)) p += '/';
    }
    return p;
  }

  var sel = document.getElementById('langSel');
  if (!sel) return;

  // 1) Construire la table des destinations à partir du <select>
  //    - si une option a data-path, on l'utilise
  //    - sinon: en => "/", autres => "/{code}/"
  var target = {};
  Array.prototype.forEach.call(sel.options, function (opt) {
    var code = (opt.value || '').trim().toLowerCase();
    if (!code) return;
    var p = opt.getAttribute('data-path');
    if (!p) p = (code === 'en') ? '/' : '/' + code + '/';
    target[code] = normPath(p);
  });

  // 2) Détecter la langue courante depuis l'URL (plus fiable que <html lang>)
  var path = normPath(location.pathname);
  var m = path.match(/^\/([a-z]{2})(?:\/|$)/i);
  var current = m ? m[1].toLowerCase() : 'en';
  if (!target[current]) current = 'en';
  sel.value = current;

  // 3) Redirection réelle au changement
  sel.addEventListener('change', function () {
    var code = (this.value || '').toLowerCase();
    var url = target[code] || '/';
    // re-lis le path courant (après une éventuelle redirection serveur)
    var here = normPath(location.pathname);
    if (url !== here) location.assign(url);
  });
})();
