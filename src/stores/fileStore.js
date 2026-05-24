import { defineStore } from "pinia";
import * as fileService from "../services/fileService";
import * as authService from "../services/authService";
import { saveFileContent } from "../services/fileStorageService";
import {
  apiRequestFormData,
  apiRequestJSON,
  getStoredAuthToken,
  isApiConfigured,
} from "../services/apiClient";
import { normalizeFileRecord } from "../services/apiSchema";
import {
  ALLOWED_UPLOAD_MESSAGE,
  validateUploadFiles,
} from "../services/fileUploadValidationService";

function extractFileList(response) {
  if (Array.isArray(response)) return response;

  const candidates = [
    response?.data,
    response?.files,
    response?.data?.files,
    response?.data?.items,
    response?.items,
  ];

  return candidates.find((value) => Array.isArray(value)) || [];
}

function extractFileRecord(response) {
  const list = extractFileList(response);
  if (list.length > 0) return list[0];

  return (
    response?.file ||
    response?.data?.file ||
    response?.data ||
    response ||
    null
  );
}

function getFileIdentity(file) {
  return file?.id || file?.contentId || file?.file_id || null;
}

function mergeFilesById(existingFiles, nextFiles) {
  const merged = Array.isArray(existingFiles) ? [...existingFiles] : [];

  nextFiles.filter(Boolean).forEach((file) => {
    const fileId = getFileIdentity(file);
    if (!fileId) {
      merged.push(file);
      return;
    }

    const index = merged.findIndex(
      (item) => String(getFileIdentity(item)) === String(fileId),
    );

    if (index === -1) {
      merged.push(file);
    } else {
      merged[index] = file;
    }
  });

  return merged;
}

export const useFileStore = defineStore("files", {
  state: () => ({
    files: [],
    isLoading: false,
  }),

  actions: {
    async loadFiles() {
      const user = authService.getCurrentUser();

      if (isApiConfigured() && getStoredAuthToken()) {
        this.isLoading = true;
        try {
          const response = await apiRequestJSON("/files", {
            method: "GET",
          });
          const files = extractFileList(response);
          this.files = files.map((file) =>
            normalizeFileRecord(file, user?.email || user || ""),
          );
          return this.files;
        } catch (error) {
          console.error("loadFiles error:", error);
          this.files = user ? fileService.getUserFiles(user.email || user) : [];
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

      const filesToUpload = Array.from(fileList || []).filter(Boolean);
      if (filesToUpload.length === 0) {
        return;
      }

      if (!validateUploadFiles(filesToUpload)) {
        throw new Error(ALLOWED_UPLOAD_MESSAGE);
      }

      if (isApiConfigured()) {
        const uploadedFiles = [];

        for (const file of filesToUpload) {
          const formData = new FormData();
          formData.append("file", file);

          const response = await apiRequestFormData("/files/upload", formData, {
            method: "POST",
          });
          const responseFiles = extractFileList(response);
          const records =
            responseFiles.length > 0 ? responseFiles : [extractFileRecord(response)];

          uploadedFiles.push(
            ...records
              .filter(Boolean)
              .map((record) => normalizeFileRecord(record, user.email || user)),
          );
        }

        if (uploadedFiles.length > 0) {
          this.files = mergeFilesById(this.files, uploadedFiles);
        }

        await this.loadFiles();
        return this.files;
      }

      const ownerEmail = user?.email || user;
      const uploaded = await Promise.all(
        filesToUpload.map(async (file) => {
          const id = crypto.randomUUID();
          await saveFileContent({
            id,
            name: file.name,
            blob: file,
            size: file.size,
            type: file.type || "",
            ownerEmail,
            createdAt: new Date().toISOString(),
          });

          return {
            id,
            name: file.name,
            size: file.size,
            type: file.type || "",
            date: new Date().toLocaleString(),
            contentId: id,
            sourceUserEmail: ownerEmail,
          };
        }),
      );

      fileService.saveFiles(ownerEmail, uploaded);
      this.files = fileService.getUserFiles(ownerEmail);
      return this.files;
    },

    async uploadSingleFile(file) {
      const user = authService.getCurrentUser();
      if (!user || !file) return null;

      if (!validateUploadFiles([file])) {
        throw new Error(ALLOWED_UPLOAD_MESSAGE);
      }

      const ownerEmail = user?.email || user;

      if (isApiConfigured()) {
        const formData = new FormData();
        formData.append("file", file);

        const response = await apiRequestFormData("/files/upload", formData, {
          method: "POST",
        });
        const uploadedFile = normalizeFileRecord(
          extractFileRecord(response),
          ownerEmail,
        );

        if (uploadedFile) {
          this.files = mergeFilesById(this.files, [uploadedFile]);
        }

        await this.loadFiles();
        return uploadedFile;
      }

      const id = crypto.randomUUID();
      await saveFileContent({
        id,
        name: file.name,
        blob: file,
        size: file.size,
        type: file.type || "",
        ownerEmail,
        createdAt: new Date().toISOString(),
      });

      const uploadedFile = {
        id,
        name: file.name,
        size: file.size,
        type: file.type || "",
        date: new Date().toLocaleString(),
        contentId: id,
        sourceUserEmail: ownerEmail,
      };

      fileService.saveFiles(ownerEmail, [uploadedFile]);
      this.files = fileService.getUserFiles(ownerEmail);
      return uploadedFile;
    },

    async uploadFile(file) {
      return this.uploadSingleFile(file);
    },

    async uploadFileVersion(fileId, file) {
      if (!isApiConfigured() || !fileId || !file) return null;

      if (!validateUploadFiles([file])) {
        throw new Error(ALLOWED_UPLOAD_MESSAGE);
      }

      const formData = new FormData();
      formData.append("file", file);

      return apiRequestFormData(`/files/${fileId}/versions`, formData, {
        method: "POST",
      });
    },

    async deleteFile(fileOrName) {
      const user = authService.getCurrentUser();
      if (!user) return;

      if (isApiConfigured()) {
        const stringValue = typeof fileOrName === "string" ? fileOrName : "";
        const fileId =
          typeof fileOrName === "object"
            ? getFileIdentity(fileOrName)
            : getFileIdentity(
                this.files.find(
                  (item) => String(getFileIdentity(item)) === String(stringValue),
                ),
              );
        const fileName =
          typeof fileOrName === "string" ? fileOrName : fileOrName?.name;

        if (fileId) {
          await apiRequestJSON(`/files/${fileId}`, { method: "DELETE" });
        } else if (fileName) {
          const file = this.files.find((item) => item.name === fileName);
          if (file?.id) {
            await apiRequestJSON(`/files/${file.id}`, { method: "DELETE" });
          }
        }

        await this.loadFiles();
        return;
      }

      fileService.deleteFile(user.email || user, fileOrName);
      this.files = fileService.getUserFiles(user.email || user);
    },
  },
});
