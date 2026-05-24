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

function getFileIdentity(file) {
  return file?.id || file?.contentId || file?.file_id || null;
}

function normalizeFiles(files) {
  const normalized = [];
  const indexById = new Map();

  files.forEach((file) => {
    if (!file) return;

    const fileId = getFileIdentity(file);
    if (!fileId) {
      normalized.push(file);
      return;
    }

    const key = String(fileId);
    const index = indexById.get(key);
    if (index === undefined) {
      indexById.set(key, normalized.length);
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

export function getFileById(userEmail, fileId) {
  const storage = getJSON("files", {});
  const files = normalizeFiles(storage[userEmail] || []);
  storage[userEmail] = files;
  setJSON("files", storage);
  return (
    files.find((file) => String(getFileIdentity(file)) === String(fileId)) ||
    null
  );
}

export function getAnyFileById(fileId) {
  const storage = getJSON("files", {});
  const files = normalizeFiles(Object.values(storage).flat());
  return (
    files.find((file) => String(getFileIdentity(file)) === String(fileId)) ||
    null
  );
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

export function deleteFile(userEmail, fileOrName) {
  const storage = getJSON("files", {});
  if (storage[userEmail]) {
    const fileId =
      typeof fileOrName === "object" ? getFileIdentity(fileOrName) : null;
    const fileName =
      typeof fileOrName === "string" ? fileOrName : fileOrName?.name;

    storage[userEmail] = storage[userEmail].filter((file) => {
      if (fileId) {
        return String(getFileIdentity(file)) !== String(fileId);
      }

      return file.name !== fileName;
    });
    setJSON("files", storage);
  }
}
