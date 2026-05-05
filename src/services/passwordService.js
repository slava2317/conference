export const PASSWORD_HINT =
  "Пароль должен содержать:\nминимум 6 символов\nхотя бы одну цифру\nхотя бы одну заглавную букву\nхотя бы один спецсимвол";

export function validatePassword(password) {
  if (!password || password.length < 6) {
    return "Пароль должен быть не короче 6 символов";
  }

  if (!/[0-9]/.test(password)) {
    return "Пароль должен содержать хотя бы одну цифру";
  }

  if (!/[A-ZА-Я]/.test(password)) {
    return "Пароль должен содержать хотя бы одну заглавную букву";
  }

  if (!/[^A-Za-zА-Яа-я0-9]/.test(password)) {
    return "Пароль должен содержать хотя бы один спецсимвол";
  }

  return "";
}
