<template>
  <div
    style="
      min-height: calc(100vh - 140px);
      background-color: var(--background-color);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px 15px;
    "
  >
    <div
      style="
        max-width: 450px;
        width: 100%;
        background-color: var(--card-background-color);
        border-radius: 16px;
        padding: 40px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        border: 1px solid var(--border-color);
      "
    >
      <h1
        style="
          font-family: &quot;Poppins&quot;, sans-serif;
          font-size: 2rem;
          font-weight: 700;
          color: var(--text-color);
          text-align: center;
          margin: 0 0 10px 0;
        "
      >
        Создать аккаунт
      </h1>
      <p
        style="
          font-family: &quot;Roboto&quot;, sans-serif;
          color: var(--light-text-color);
          text-align: center;
          margin: 0 0 30px 0;
          font-size: 0.95rem;
        "
      >
        Присоединитесь к нашему сообществу и откройте новые возможности
      </p>

      <form
        @submit.prevent="register"
        style="display: flex; flex-direction: column; gap: 16px"
      >
        <!-- Имя -->
        <div>
          <label
            style="
              display: block;
              font-family: &quot;Roboto&quot;, sans-serif;
              font-size: 0.85rem;
              font-weight: 500;
              color: var(--text-color);
              margin-bottom: 6px;
            "
          >
            👤 Имя
          </label>
          <input
            v-model="firstName"
            type="text"
            placeholder="Введите ваше имя"
            class="auth-input"
          />
        </div>

        <!-- Фамилия -->
        <div>
          <label
            style="
              display: block;
              font-family: &quot;Roboto&quot;, sans-serif;
              font-size: 0.85rem;
              font-weight: 500;
              color: var(--text-color);
              margin-bottom: 6px;
            "
          >
            👤 Фамилия
          </label>
          <input
            v-model="lastName"
            type="text"
            placeholder="Введите вашу фамилию"
            class="auth-input"
          />
        </div>

        <!-- Email -->
        <div>
          <label
            style="
              display: block;
              font-family: &quot;Roboto&quot;, sans-serif;
              font-size: 0.85rem;
              font-weight: 500;
              color: var(--text-color);
              margin-bottom: 6px;
            "
          >
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
          <label
            style="
              display: block;
              font-family: &quot;Roboto&quot;, sans-serif;
              font-size: 0.85rem;
              font-weight: 500;
              color: var(--text-color);
              margin-bottom: 6px;
            "
          >
            🔐 Пароль
          </label>
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
        <button type="submit" class="auth-button">✨ Создать аккаунт</button>
      </form>

      <!-- Ссылка на вход -->
      <p
        style="
          text-align: center;
          margin-top: 20px;
          font-family: &quot;Roboto&quot;, sans-serif;
          color: var(--light-text-color);
          font-size: 0.9rem;
        "
      >
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

const firstName = ref("");
const lastName = ref("");
const email = ref("");
const password = ref("");
const auth = useAuthStore();
const router = useRouter();

function register() {
  const firstNameValue = firstName.value.trim();
  const lastNameValue = lastName.value.trim();
  const emailValue = email.value.trim();
  const passwordValue = password.value;

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

  const success = auth.register(
    firstNameValue,
    lastNameValue,
    emailValue,
    passwordValue,
  );
  if (!success) {
    showToast("Пользователь с таким email уже зарегистрирован");
    return;
  }

  showToast("Регистрация успешна");
  router.push("/login");
}
</script>

<style scoped>
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
</style>
