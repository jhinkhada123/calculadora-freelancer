/**
 * Inicialização do head: canonical, noindex, og/twitter.
 * Executado antes do resto da página. Sem dependências.
 */
(function() {
  var o = window.location.origin;
  var p = (window.location.pathname || "/").replace(/\/$/, "") || "";
  var base = o + (p || "/");
  var canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) canonical.href = base;
  var params = new URLSearchParams(window.location.search || "");
  var needsNoindex = params.get("view") === "client" || ["currency","targetIncome","monthlyCosts","projectHours","projectNet","professionalName","clientName","validityDate"].some(function(k) { return params.has(k); });
  if (needsNoindex) {
    var m = document.createElement("meta");
    m.name = "robots";
    m.content = "noindex, nofollow";
    document.head.appendChild(m);
  }
  var ogUrl = document.querySelector('meta[property="og:url"]');
  if (ogUrl) ogUrl.content = base;
  var ogImageUrl = new URL("/og-image.png", window.location.origin).toString();
  var ogImg = document.querySelector('meta[property="og:image"]');
  if (ogImg) ogImg.content = ogImageUrl;
  var twImg = document.querySelector('meta[name="twitter:image"]');
  if (twImg) twImg.content = ogImageUrl;
})();
