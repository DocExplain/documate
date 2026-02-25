/*
 * SPDX-FileCopyrightText: 2025 DocExpain
 * SPDX-License-Identifier: LicenseRef-SA-NC-1.0
 */
(function () {
  // Définition des topics et de leurs chemins "propres"
  var TOPICS = {
    bill: {
      en: { path: "/explain/bill/" },
      fr: { path: "/fr/expliquer/facture/" }
    },
    contract: {
      en: { path: "/explain/contract/" },
      fr: { path: "/fr/expliquer/contrat/" }
    }
  };

  function withSlash(p){ return p.endsWith("/") ? p : p + "/"; }
  function curLang(){ return location.pathname.startsWith("/fr/") ? "fr" : "en"; }

  // 1) Détection du topic
  function getTopicFromQuery(){
    var t = new URLSearchParams(location.search).get("topic");
    return (t && TOPICS[t]) ? t : null;
  }
  function getTopicFromPath(){
    var p = withSlash(location.pathname);
    for (var k in TOPICS){
      if (p === TOPICS[k].en.path || p === TOPICS[k].fr.path) return k;
    }
    return null;
  }

  // 2) Calcul de la canonical cible
  function canonicalFor(topic){
    var p = withSlash(location.pathname);
    var conf = TOPICS[topic];
    if (!conf) return p;
    // si on est déjà sur l’un des chemins "propres", garder tel quel
    if (p === conf.en.path || p === conf.fr.path) return p;
    // sinon, pointer vers la version dans la langue courante (fallback EN)
    return (conf[curLang()] && conf[curLang()].path) || conf.en.path;
  }

  var origin = location.origin;
  var topic = getTopicFromQuery() || getTopicFromPath();
  var canonPath = topic ? canonicalFor(topic) : withSlash(location.pathname);
  var canonicalAbs = origin + canonPath;

  // 3) Poser la canonical immédiatement (id ou rel=canonical)
  var link = document.getElementById("canonical-link")
          || document.getElementById("link-canonical")
          || document.querySelector('link[rel="canonical"]');
  if (link) link.href = canonicalAbs;

  // 4) Mettre à jour og:url / twitter:url si présents
  var og = document.querySelector('meta[property="og:url"]');
  if (og) og.setAttribute("content", canonicalAbs);
  var tw = document.querySelector('meta[name="twitter:url"]');
  if (tw) tw.setAttribute("content", canonicalAbs);

  // 5) JSON-LD FAQ minimal (idempotent) — utile pour Lighthouse SEO
  if (topic && !document.getElementById("ld-faq")) {
    var isFr = (curLang() === "fr");
    var FAQ = {
      "@context":"https://schema.org",
      "@type":"FAQPage",
      "mainEntity":[
        {"@type":"Question","name": isFr ? "Comment ça marche ?" : "How does it work?",
         "acceptedAnswer":{"@type":"Answer","text": isFr
           ? "Collez ou uploadez le document, puis posez vos questions."
           : "Upload or paste your document, then ask questions."
         }}
      ]
    };
    var s = document.createElement("script");
    s.type = "application/ld+json";
    s.id = "ld-faq";
    try { s.text = JSON.stringify(FAQ); } catch(e) {}
    document.head.appendChild(s);
  }
})();
