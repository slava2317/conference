import { defineStore } from "pinia";
import * as fileService from "../services/fileService";
import * as authService from "../services/authService";
import { saveFileContent } from "../services/fileStorageService";
import {
  apiRequestFormData,
  apiRequestJSON,
  isApiConfigured,
} from "../services/apiClient";
import { normalizeFileRecord } from "../services/apiSchema";

export const useFileStore = defineStore("files", {
  state: () => ({
    files: [],
    isLoading: false,
  }),

  actions: {
    async loadFiles() {
      const user = authService.getCurrentUser();

      if (isApiConfigured()) {
        this.isLoading = true;
        try {
          const response = await apiRequestJSON("/api/files", {
            method: "GET",
          });
          const files = Array.isArray(response)
            ? response
            : response?.data || response?.files || [];
          this.files = files.map((file) =>
            normalizeFileRecord(file, user?.email || user || ""),
          );
          return this.files;
        } finally {
          this.isLoading = false;
        }
      }

      this.files = user ? fileService.getUserFiles(user.email || user) : [];
      return this.files;
    },

    async uploadFiles(fileList) {
      const user = authService.getCurrentUser();
      if (!user) return;

      if (isApiConfigured()) {
        const formData = new FormData();
        Array.from(fileList).forEach((file) => {
          formData.append("files[]", file);
        });

        const response = await apiRequestFormData(
          "/api/files/upload-multiple",
          formData,
          { method: "POST" },
        );

        const uploadedFiles = Array.isArray(response)
          ? response
          : response?.data || response?.files || [];

        this.files = uploadedFiles.map((file) =>
          normalizeFileRecord(file, user.email || user),
        );
        return this.files;
      }

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
      return this.files;
    },

    async deleteFile(fileOrName) {
      const user = authService.getCurrentUser();
      if (!user) return;

      if (isApiConfigured()) {
        const fileId = typeof fileOrName === "object" ? fileOrName?.id : null;
        const fileName =
          typeof fileOrName === "string" ? fileOrName : fileOrName?.name;

        if (fileId) {
          await apiRequestJSON(`/api/files/${fileId}`, { method: "DELETE" });
        } else if (fileName) {
          const file = this.files.find((item) => item.name === fileName);
          if (file?.id) {
            await apiRequestJSON(`/api/files/${file.id}`, { method: "DELETE" });
          }
        }

        await this.loadFiles();
        return;
      }

      const fileName =
        typeof fileOrName === "string" ? fileOrName : fileOrName?.name;
      fileService.deleteFile(user.email || user, fileName);
      this.files = fileService.getUserFiles(user.email || user);
    },
  },
});
