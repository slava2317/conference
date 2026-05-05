import { defineStore } from "pinia";
import * as fileService from "../services/fileService";
import * as authService from "../services/authService";
import { saveFileContent } from "../services/fileStorageService";

export const useFileStore = defineStore("files", {
  state: () => ({
    files: [],
  }),

  actions: {
    loadFiles() {
      const user = authService.getCurrentUser();
      this.files = user ? fileService.getUserFiles(user) : [];
    },

    async uploadFiles(fileList) {
      const user = authService.getCurrentUser();
      if (!user) return;

      const uploaded = await Promise.all(
        Array.from(fileList).map(async (file) => {
          const id = crypto.randomUUID();
          await saveFileContent({
            id,
            name: file.name,
            blob: file,
            size: file.size,
            type: file.type || "",
            ownerEmail: user,
            createdAt: new Date().toISOString(),
          });

          return {
            id,
            name: file.name,
            size: file.size,
            type: file.type || "",
            date: new Date().toLocaleString(),
            contentId: id,
            sourceUserEmail: user,
          };
        }),
      );

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
