import { getJSON, setJSON } from "./storageService";

export function saveFiles(userEmail, files) {
  const storage = getJSON("files", {});
  storage[userEmail] = [...(storage[userEmail] || []), ...files];
  setJSON("files", storage);
}

export function getUserFiles(userEmail) {
  const storage = getJSON("files", {});
  return storage[userEmail] || [];
}

export function deleteFile(userEmail, fileName) {
  const storage = getJSON("files", {});
  if (storage[userEmail]) {
    storage[userEmail] = storage[userEmail].filter((f) => f.name !== fileName);
    setJSON("files", storage);
  }
}
