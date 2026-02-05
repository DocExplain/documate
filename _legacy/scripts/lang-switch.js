/* SPDX-FileCopyrightText: 2025 DocExpain
 * SPDX-License-Identifier: LicenseRef-SA-NC-1.0
 */
(function () {
  // util
  function normPath(p) {
    if (!p) return '/';
    if (!p.startsWith('/')) p = '/' + p;
    
    // CORRECTION : On s'assure qu'il N'Y A PAS de slash à la fin
    // (sauf si c'est la racine pure "/")
    if (p.length > 1 && p.endsWith('/')) {
      p = p.slice(0, -1);
    }
    return p;
  }

  var sel = document.getElementById('langSel');
  if (!sel) return;

  // 1) Construire la table des destinations à partir du <select>
  //    - si une option a data-path, on l'utilise
  //    - sinon: en => "/", autres => "/{code}" (SANS SLASH FINAL)
  var target = {};
  Array.prototype.forEach.call(sel.options, function (opt) {
    var code = (opt.value || '').trim().toLowerCase();
    if (!code) return;
    var p = opt.getAttribute('data-path');
    if (!p) p = (code === 'en') ? '/' : '/' + code; // Modifié ici
    target[code] = normPath(p);
  });

  // 2) Détecter la langue courante depuis l'URL
  var path = normPath(location.pathname);
  var m = path.match(/^\/([a-z]{2})(?:\/|$)/i);
  var current = m ? m[1].toLowerCase() : 'en';
  if (!target[current]) current = 'en';
  sel.value = current;

  // 3) Redirection réelle au changement
  sel.addEventListener('change', function () {
    var code = (this.value || '').toLowerCase();
    var url = target[code] || '/';
    // re-lis le path courant
    var here = normPath(location.pathname);
    if (url !== here) location.assign(url);
  });
})();
