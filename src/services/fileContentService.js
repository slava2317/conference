import { getFileContent } from "./fileStorageService";
import { apiRequest, isApiConfigured } from "./apiClient";

export function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(String(reader.result || ""));
    };

    reader.onerror = () => {
      reject(new Error("Не удалось прочитать файл"));
    };

    reader.readAsDataURL(file);
  });
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return true;
}

export async function downloadStoredFile(file) {
  if (!file?.name) return false;

  if (isApiConfigured() && (file?.downloadUrl || file?.id)) {
    try {
      const response = await apiRequest(
        file.downloadUrl || `/api/files/${file.id}/download`,
        { method: "GET", responseType: "blob" },
      );

      if (response instanceof Blob) {
        return downloadBlob(response, file.name);
      }

      if (typeof response === "string" && response) {
        const link = document.createElement("a");
        link.href = response;
        link.download = file.name;
        link.rel = "noopener";
        document.body.appendChild(link);
        link.click();
        link.remove();
        return true;
      }
    } catch (error) {
      console.error("downloadStoredFile api error:", error);
    }
  }

  if (file?.blob instanceof Blob) {
    return downloadBlob(file.blob, file.name);
  }

  if (file?.contentId) {
    const storedFile = await getFileContent(file.contentId);
    if (storedFile?.blob instanceof Blob) {
      return downloadBlob(storedFile.blob, file.name || storedFile.name);
    }
  }

  if (file?.content) {
    const link = document.createElement("a");
    link.href = file.content;
    link.download = file.name;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
    return true;
  }

  return false;
}
