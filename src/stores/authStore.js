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
    async bootstrap() {
      const user = await authService.fetchCurrentUser();
      this.user = user;
      return user;
    },

    async register(firstName, lastName, email, password) {
      return authService.registerUser({ firstName, lastName, email, password });
    },

    async login(email, password) {
      const user = await authService.loginUser(email, password);
      if (!user) return false;
      this.user = user;
      return true;
    },

    async logout() {
      await authService.logoutUser();
      this.user = null;
    },

    async changePassword(currentPassword, newPassword) {
      if (authService.changePasswordOnServer) {
        try {
          return await authService.changePasswordOnServer(
            currentPassword,
            newPassword,
          );
        } catch (error) {
          console.error("changePassword error:", error);
          return false;
        }
      }

      const users = authService.getJSON("users", []);
      const email = typeof this.user === "string" ? this.user : this.user.email;
      const user = users.find(
        (u) => u.email === email && u.password === currentPassword,
      );

      if (!user) return false;

      user.password = newPassword;
      authService.setJSON("users", users);
      return true;
    },

    async deleteAccount() {
      if (authService.deleteAccountOnServer) {
        try {
          await authService.deleteAccountOnServer();
        } catch (error) {
          console.error("deleteAccount error:", error);
        }
      }

      const users = authService.getJSON("users", []);
      const email = typeof this.user === "string" ? this.user : this.user.email;
      const filtered = users.filter((u) => u.email !== email);
      authService.setJSON("users", filtered);

      // удалить файлы пользователя
      const files = authService.getJSON("files", {});
      delete files[email];
      authService.setJSON("files", files);

      await this.logout();
    },
  },
});
