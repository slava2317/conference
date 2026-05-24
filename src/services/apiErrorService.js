function normalizeErrorErrors(errors) {
  if (!errors || typeof errors !== "object") return [];

  return Object.entries(errors).flatMap(([field, messages]) => {
    const values = Array.isArray(messages) ? messages : [messages];
    return values
      .filter(Boolean)
      .map((message) => `${field}: ${String(message)}`);
  });
}

export function getApiErrorMessage(error, fallback = "Произошла ошибка") {
  const status = Number(error?.status || error?.response?.status || 0);
  const payload = error?.payload || error?.response?.data || null;
  const baseMessage =
    (typeof payload === "string" ? payload : payload?.message) ||
    error?.message ||
    fallback;

  if (status === 401) {
    return "Требуется авторизация";
  }

  if (status === 403) {
    return "Доступ запрещен";
  }

  if (status === 409) {
    return baseMessage || "Конфликт данных";
  }

  if (status === 429) {
    return "Слишком много попыток. Подождите минуту и попробуйте снова.";
  }

  if (status === 422) {
    const validationErrors = normalizeErrorErrors(
      error?.errors || payload?.errors,
    );

    if (validationErrors.length > 0) {
      return validationErrors.join("; ");
    }

    return baseMessage || "Ошибка валидации";
  }

  if (status >= 500) {
    return baseMessage || "Ошибка сервера";
  }

  return baseMessage;
}

export function isUnauthorizedError(error) {
  return Number(error?.status || error?.response?.status || 0) === 401;
}
