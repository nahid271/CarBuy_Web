/**
 * Runs in <head> before first paint (see layout.tsx): applies the saved theme,
 * or the CarBuy dark default when nothing is saved, so dark mode never flashes light.
 * ThemeToggle writes the same "theme" key.
 */
export const themeScript = `(function(){try{var t=localStorage.getItem("theme");document.documentElement.classList.toggle("dark",t?t==="dark":true)}catch(e){document.documentElement.classList.add("dark")}})()`
