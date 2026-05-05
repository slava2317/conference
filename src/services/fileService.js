import { getJSON, setJSON } from "./storageService";

function prefersNewerFile(existingFile, nextFile) {
  if (!existingFile) return true;
  if (Boolean(nextFile?.contentId) !== Boolean(existingFile?.contentId)) {
    return Boolean(nextFile?.contentId);
  }
  if (Boolean(nextFile?.content) !== Boolean(existingFile?.content)) {
    return Boolean(nextFile?.content);
  }
  return true;
}

function normalizeFiles(files) {
  const normalized = [];

  files.forEach((file) => {
    const index = normalized.findIndex((item) => item.name === file.name);
    if (index === -1) {
      normalized.push(file);
      return;
    }

    if (prefersNewerFile(normalized[index], file)) {
      normalized[index] = file;
    }
  });

  return normalized;
}

export function saveFiles(userEmail, files) {
  const storage = getJSON("files", {});
  const existingFiles = Array.isArray(storage[userEmail])
    ? storage[userEmail]
    : [];
  storage[userEmail] = normalizeFiles([...existingFiles, ...files]);
  setJSON("files", storage);
}

export function getFileByName(userEmail, fileName) {
  const storage = getJSON("files", {});
  const files = normalizeFiles(storage[userEmail] || []);
  storage[userEmail] = files;
  setJSON("files", storage);
  return files.find((file) => file.name === fileName) || null;
}

export function getAnyFileByName(fileName) {
  const storage = getJSON("files", {});
  const files = normalizeFiles(Object.values(storage).flat());
  return files.find((file) => file.name === fileName) || null;
}

export function getUserFiles(userEmail) {
  const storage = getJSON("files", {});
  const files = normalizeFiles(storage[userEmail] || []);
  if (JSON.stringify(storage[userEmail] || []) !== JSON.stringify(files)) {
    storage[userEmail] = files;
    setJSON("files", storage);
  }
  return files;
}

export function deleteFile(userEmail, fileName) {
  const storage = getJSON("files", {});
  if (storage[userEmail]) {
    storage[userEmail] = storage[userEmail].filter((f) => f.name !== fileName);
    setJSON("files", storage);
  }
}
