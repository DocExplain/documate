/* SPDX-FileCopyrightText: 2025 DocExpain
 * SPDX-License-Identifier: LicenseRef-SA-NC-1.0
 */
(function () {
  function t(key, fallbackEn, fallbackFr) {
    try {
      var lang = (document.documentElement.lang || 'en').toLowerCase();
      var T = (window.I18N && window.I18N[lang]) || {};
      return (T && T[key]) || (lang === 'fr' ? (fallbackFr || fallbackEn) : fallbackEn);
    } catch (e) { return fallbackEn; }
  }

  // selectors (minimal assumptions)
  var panel = document.getElementById('privacy-card')
           || document.getElementById('privacyBox')
           || document.querySelector('.card.legal'); // the privacy card element
  if (!panel) return;

  var hideBtn = document.getElementById('privacy-hide-toggle')
            || panel.querySelector('[data-privacy-hide]')
            || panel.querySelector('button, a'); // last resort if your header has a single "Hide" control
  var main = document.querySelector('main');
  var help = document.getElementById('help-card') || document.querySelector('#help-card');
  var work = document.getElementById('work-card') || document.querySelector('#work-card');
  var helpParent = help ? help.parentNode : null;
  var helpNext   = help ? help.nextSibling : null;

  // create the floating FAB
  var fab = document.getElementById('privacy-fab');
  if (!fab) {
    fab = document.createElement('button');
    fab.id = 'privacy-fab';
    fab.type = 'button';
    fab.className = 'privacy-fab';
    document.body.appendChild(fab);
  }

  var SHOW = t('showPrivacy', 'Show', 'Afficher');
  var HIDE = t('hidePrivacy', 'Hide', 'Masquer');

  function applyState(open) {
    if (panel) panel.style.display = open ? '' : 'none';
    if (main)  main.classList.toggle('no-privacy', !open);
    if (help) {
      if (!open) {
        // Privacy hidden -> single column
        // Move HELP INSIDE LEFT COLUMN, ABOVE the work card
        help.classList.add('fullwidth-help');
        if (work && work.parentNode) {
          try { work.parentNode.insertBefore(help, work); } catch(e){}
        } else if (main) {
          try { main.prepend(help); } catch(e){}
        }
      } else {
        // Restore original position
        help.classList.remove('fullwidth-help');
        if (helpParent) {
          try { helpParent.insertBefore(help, helpNext); } catch(e){}
        }
      }
    }
    fab.hidden = !!open;
    fab.setAttribute('aria-expanded', open ? 'true':'false');
    fab.setAttribute('title', open ? HIDE : SHOW);
    fab.textContent = SHOW;
    try { localStorage.setItem('privacy-open', open ? '1' : '0'); } catch(e){}
  }

  try {
    var mq = window.matchMedia('(min-width: 981px)');
    mq.addEventListener('change', function(){ applyState(localStorage.getItem('privacy-open') !== '0'); });
  } catch(e){}

  function restore() {
    var s = null;
    try { s = localStorage.getItem('privacy-open'); } catch(e){}
    return s !== '0'; // default open
  }

  // wire events
  if (hideBtn) {
    hideBtn.addEventListener('click', function(e){ e.preventDefault(); applyState(false); });
    // keep label up-to-date if this is a text button
    try {
      var txt = hideBtn.textContent.trim().toLowerCase();
      if (txt === 'hide' || txt === 'masquer') hideBtn.textContent = HIDE;
    } catch(e){}
  }
  fab.addEventListener('click', function(e){ e.preventDefault(); applyState(true); try{ panel.scrollIntoView({behavior:'smooth', block:'start'});}catch(e){}; });

  // initial
  applyState(restore());
})();
