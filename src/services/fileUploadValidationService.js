export const ALLOWED_UPLOAD_EXTENSIONS = ["pdf", "txt", "docx", "pptx"];
export const ALLOWED_UPLOAD_ACCEPT = ".pdf,.txt,.docx,.pptx";
export const ALLOWED_UPLOAD_MESSAGE =
  "Можно загружать только PDF, TXT, DOCX и PPTX.";

export function getFileExtension(fileName = "") {
  const lastPart = String(fileName).split(".").pop() || "";
  return lastPart.trim().toLowerCase();
}

export function isAllowedUploadFile(file) {
  return ALLOWED_UPLOAD_EXTENSIONS.includes(getFileExtension(file?.name));
}

export function validateUploadFiles(fileList) {
  return Array.from(fileList || []).every(isAllowedUploadFile);
}
