// Runs before first paint so no page flashes light in dark mode. Kept external, not inline, to
// match production's CSP. Mirrors src/shared/lib/theme-preference.ts: "dark" or else light.
(function () {
  var theme = "light";
  try { if (localStorage.getItem("agentdoor-theme") === "dark") theme = "dark"; } catch (error) { /* storage blocked */ }
  document.documentElement.dataset.theme = theme;
})();
