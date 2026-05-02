import { defineStore } from "pinia";
import * as fileService from "../services/fileService";
import * as authService from "../services/authService";

export const useFileStore = defineStore("files", {
  state: () => ({
    files: [],
  }),

  actions: {
    loadFiles() {
      const user = authService.getCurrentUser();
      this.files = user ? fileService.getUserFiles(user) : [];
    },

    uploadFiles(fileList) {
      const user = authService.getCurrentUser();
      if (!user) return;

      const uploaded = Array.from(fileList).map((f) => ({
        name: f.name,
        size: f.size,
        date: new Date().toLocaleString(),
      }));

      fileService.saveFiles(user, uploaded);
      this.files = fileService.getUserFiles(user);
    },

    deleteFile(fileName) {
      const user = authService.getCurrentUser();
      if (!user) return;

      fileService.deleteFile(user, fileName);
      this.files = fileService.getUserFiles(user);
    },
  },
});
