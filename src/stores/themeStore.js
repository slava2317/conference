import { defineStore } from "pinia";

export const useThemeStore = defineStore("theme", {
  state: () => ({
    isDark: localStorage.getItem("theme") === "dark",
  }),

  actions: {
    toggleTheme() {
      this.isDark = !this.isDark;
      localStorage.setItem("theme", this.isDark ? "dark" : "light");
      this.applyTheme();
    },

    applyTheme() {
      if (this.isDark) {
        document.documentElement.setAttribute("data-theme", "dark");
      } else {
        document.documentElement.removeAttribute("data-theme");
      }
    },

    initTheme() {
      const savedTheme = localStorage.getItem("theme");
      if (savedTheme) {
        this.isDark = savedTheme === "dark";
      } else {
        this.isDark =
          window.matchMedia &&
          window.matchMedia("(prefers-color-scheme: dark)").matches;
      }
      this.applyTheme();
    },
  },
});
