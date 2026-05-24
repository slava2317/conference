<template>
  <div class="auth-page">
    <div class="auth-card">
      <h1 class="auth-title">Создать аккаунт</h1>
      <p class="auth-subtitle">
        Присоединитесь к нашему сообществу и откройте новые возможности
      </p>

      <form @submit.prevent="register" class="auth-form">
        <!-- Имя -->
        <div>
          <label class="auth-label"> 👤 Имя </label>
          <input
            v-model="firstName"
            type="text"
            placeholder="Введите ваше имя"
            class="auth-input"
          />
        </div>

        <!-- Фамилия -->
        <div>
          <label class="auth-label"> 👤 Фамилия </label>
          <input
            v-model="lastName"
            type="text"
            placeholder="Введите вашу фамилию"
            class="auth-input"
          />
        </div>

        <!-- Email -->
        <div>
          <label class="auth-label"> 📧 Email </label>
          <input
            v-model="email"
            type="email"
            placeholder="your@email.com"
            class="auth-input"
            @input="emailError = ''"
          />
          <p v-if="emailError" class="auth-field-error">{{ emailError }}</p>
        </div>

        <!-- Пароль -->
        <div>
          <label class="auth-label"> 🔐 Пароль </label>
          <div class="password-field" :data-password-tip="PASSWORD_HINT">
            <input
              v-model="password"
              type="password"
              placeholder="Минимум 6 символов"
              class="auth-input"
            />
          </div>
        </div>

        <!-- Кнопка регистрации -->
        <button type="submit" class="auth-button" :disabled="isSubmitting">
          {{ isSubmitting ? "Создаем..." : "✨ Создать аккаунт" }}
        </button>
      </form>

      <!-- Ссылка на вход -->
      <p class="auth-footer">
        Уже есть аккаунт?
        <router-link to="/login" class="auth-link"> Войти здесь </router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/authStore";
import { showToast } from "../services/notificationService";
import { PASSWORD_HINT, validatePassword } from "../services/passwordService";
import { getApiErrorMessage } from "../services/apiErrorService";

const firstName = ref("");
const lastName = ref("");
const email = ref("");
const password = ref("");
const isSubmitting = ref(false);
const emailError = ref("");
const auth = useAuthStore();
const router = useRouter();

async function register() {
  if (isSubmitting.value) return;

  const firstNameValue = firstName.value.trim();
  const lastNameValue = lastName.value.trim();
  const emailValue = email.value.trim();
  const passwordValue = password.value;
  emailError.value = "";

  if (!firstNameValue || !lastNameValue || !emailValue || !passwordValue) {
    showToast("Заполните все поля");
    return;
  }

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRe.test(emailValue)) {
    showToast("Введите корректный email");
    return;
  }

  const passwordError = validatePassword(passwordValue);
  if (passwordError) {
    showToast(passwordError);
    return;
  }

  try {
    isSubmitting.value = true;
    const success = await auth.register(
      firstNameValue,
      lastNameValue,
      emailValue,
      passwordValue,
    );
    if (!success) {
      emailError.value = "Пользователь с такой почтой уже зарегистрирован";
      return;
    }

    showToast("Регистрация успешна");
    router.push("/login");
  } catch (error) {
    const status = Number(error?.status || error?.response?.status || 0);
    if (status === 409) {
      emailError.value = "Пользователь с такой почтой уже зарегистрирован";
      return;
    }

    showToast(getApiErrorMessage(error, "Не удалось зарегистрировать аккаунт"));
    console.error("register error:", error);
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<style scoped>
.auth-page {
  min-height: calc(100vh - 140px);
  background-color: var(--background-color);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 15px;
}

.auth-card {
  max-width: 450px;
  width: 100%;
  background-color: var(--card-background-color);
  border-radius: 16px;
  padding: 40px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid var(--border-color);
}

.auth-title {
  font-family: "Poppins", sans-serif;
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-color);
  text-align: center;
  margin: 0 0 10px;
}

.auth-subtitle {
  font-family: "Roboto", sans-serif;
  color: var(--light-text-color);
  text-align: center;
  margin: 0 0 30px;
  font-size: 0.95rem;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.auth-label {
  display: block;
  font-family: "Roboto", sans-serif;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-color);
  margin-bottom: 6px;
}

.auth-input {
  width: 100%;
  padding: 12px 14px;
  border: 2px solid var(--border-color);
  border-radius: 10px;
  background-color: var(--card-background-color);
  color: var(--text-color);
  font-family: "Roboto", sans-serif;
  font-size: 0.95rem;
  transition: all 0.3s ease;
  box-sizing: border-box;
}

.auth-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(74, 105, 226, 0.1);
}

.auth-button {
  width: 100%;
  padding: 14px;
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: 10px;
  font-family: "Poppins", sans-serif;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 10px;
}

.auth-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(74, 105, 226, 0.4);
}

.auth-button:active {
  transform: translateY(0);
}

.auth-button:disabled {
  cursor: not-allowed;
  opacity: 0.7;
  transform: none;
  box-shadow: none;
}

.auth-footer {
  text-align: center;
  margin-top: 20px;
  font-family: "Roboto", sans-serif;
  color: var(--light-text-color);
  font-size: 0.9rem;
}

.auth-link {
  color: var(--primary-color);
  text-decoration: none;
  font-weight: 600;
  transition: color 0.3s;
  cursor: pointer;
}

.auth-link:hover {
  color: var(--secondary-color);
}

.auth-field-error {
  margin: 6px 0 0;
  font-family: "Roboto", sans-serif;
  font-size: 0.85rem;
  color: #d34b4b;
}
</style>
