import { defineStore } from "pinia";
import * as authService from "../services/authService";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: authService.getCurrentUser(),
  }),

  getters: {
    isAuthenticated: (state) => !!state.user,
  },

  actions: {
    register(firstName, lastName, email, password) {
      return authService.registerUser({ firstName, lastName, email, password });
    },

    login(email, password) {
      const user = authService.loginUser(email, password);
      if (!user) return false;
      this.user = user;
      return true;
    },

    logout() {
      this.user = null;
      authService.logoutUser();
    },

    changePassword(currentPassword, newPassword) {
      const users = authService.getJSON("users", []);
      const email = typeof this.user === "string" ? this.user : this.user.email;
      const user = users.find(
        (u) => u.email === email && u.password === currentPassword
      );

      if (!user) return false;

      user.password = newPassword;
      authService.setJSON("users", users);
      return true;
    },

    deleteAccount() {
      const users = authService.getJSON("users", []);
      const email = typeof this.user === "string" ? this.user : this.user.email;
      const filtered = users.filter((u) => u.email !== email);
      authService.setJSON("users", filtered);

      // удалить файлы пользователя
      const files = authService.getJSON("files", {});
      delete files[email];
      authService.setJSON("files", files);

      this.logout();
    },
  },
});
