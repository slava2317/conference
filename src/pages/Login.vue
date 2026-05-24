<template>
  <div class="auth-page">
    <div class="auth-card">
      <h1 class="auth-title">
        Вход
      </h1>
      <p class="auth-subtitle">
        Введите ваши учетные данные для входа
      </p>

      <form @submit.prevent="login" class="auth-form">
        <!-- Email -->
        <div>
          <label class="auth-label">
            📧 Email
          </label>
          <input
            v-model="email"
            type="email"
            placeholder="your@email.com"
            class="auth-input"
          />
        </div>

        <!-- Пароль -->
        <div>
          <label class="auth-label">
            🔐 Пароль
          </label>
          <div class="password-field" :data-password-tip="PASSWORD_HINT">
            <input
              v-model="password"
              type="password"
              placeholder="Введите пароль"
              class="auth-input"
            />
          </div>
        </div>

        <!-- Кнопка входа -->
        <button type="submit" class="auth-button" :disabled="isSubmitting">
          {{ isSubmitting ? "Входим..." : "🚀 Войти" }}
        </button>
      </form>

      <!-- Ссылка на регистрацию -->
      <p class="auth-footer">
        Нет аккаунта?
        <router-link to="/register" class="auth-link">
          Зарегистрироваться
        </router-link>
      </p>

      <!-- Забыли пароль -->
      <p class="auth-footer auth-footer--forgot">
        <router-link to="/forgot" class="forgot-link">
          Забыли пароль?
        </router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useAuthStore } from "../stores/authStore";
import { useRouter } from "vue-router";
import { showToast } from "../services/notificationService";
import { PASSWORD_HINT } from "../services/passwordService";
import { getApiErrorMessage } from "../services/apiErrorService";

const email = ref("");
const password = ref("");
const isSubmitting = ref(false);
const auth = useAuthStore();
const router = useRouter();

async function login() {
  if (isSubmitting.value) return;

  const emailValue = email.value.trim();
  const passwordValue = password.value;

  if (!emailValue || !passwordValue) {
    showToast("Заполните все поля");
    return;
  }

  try {
    isSubmitting.value = true;
    const success = await auth.login(emailValue, passwordValue);

    if (!success) {
      showToast("Неверные данные");
      return;
    }

    showToast("Успешный вход!");
    router.push("/");
  } catch (error) {
    showToast(getApiErrorMessage(error, "Не удалось выполнить вход"));
    console.error("login error:", error);
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
  max-width: 400px;
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
  gap: 18px;
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

.auth-footer--forgot {
  margin-top: 15px;
  font-size: 0.85rem;
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

.forgot-link {
  color: var(--secondary-color);
  text-decoration: none;
  transition: opacity 0.3s;
  cursor: pointer;
}

.forgot-link:hover {
  opacity: 0.8;
}
</style>
