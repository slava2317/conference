export const MAX_SPEAKER_PHOTO_SIZE_BYTES = 2 * 1024 * 1024;

export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function validateSpeakerPhotoFile(file) {
  if (!file) return "Выберите файл изображения";

  if (!file.type || !file.type.startsWith("image/")) {
    return "Можно загрузить только изображение";
  }

  if (file.size > MAX_SPEAKER_PHOTO_SIZE_BYTES) {
    return `Фото спикера должно быть не больше ${formatFileSize(
      MAX_SPEAKER_PHOTO_SIZE_BYTES,
    )}`;
  }

  return "";
}

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
