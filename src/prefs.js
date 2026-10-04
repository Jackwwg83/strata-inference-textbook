/* Reader preferences that need a rule, kept apart from app.js so node tests can load them. */
(function (root) {
  'use strict';
  // Light = book skin (default), dark = neon skin. Old records saved "dark" as the
  // default without the reader choosing it, so only an explicit choice is kept.
  function pickTheme(saved) {
    const s = saved || {};
    return s.themeChosen === true && (s.theme === 'light' || s.theme === 'dark') ? s.theme : 'light';
  }
  root.Prefs = { pickTheme };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.Prefs;
})(typeof globalThis !== 'undefined' ? globalThis : this);
