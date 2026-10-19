/**
 * Runs in <head> before first paint (see layout.tsx): applies the saved theme,
 * or the OS preference when nothing is saved, so dark mode never flashes light.
 * ThemeToggle writes the same "theme" key.
 */
export const themeScript = `(function(){try{var t=localStorage.getItem("theme");var d=t?t==="dark":matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d)}catch(e){}})()`
