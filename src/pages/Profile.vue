<template>
  <div class="profile-page">
    <div class="profile-container">
      <div class="profile-card profile-card--spaced">
        <h1 class="profile-title">Мой профиль</h1>

        <div class="profile-grid profile-grid--spaced">
          <div>
            <p class="profile-label">Имя</p>
            <p class="profile-value">{{ userFirstName }}</p>
          </div>

          <div>
            <p class="profile-label">Фамилия</p>
            <p class="profile-value">{{ userLastName }}</p>
          </div>
        </div>

        <div class="profile-field">
          <p class="profile-label">Email</p>
          <p class="profile-value profile-value--break">{{ userEmail }}</p>
        </div>

        <div class="profile-divider"></div>
      </div>

      <div class="profile-card profile-card--spaced">
        <h2 class="profile-section-title">Смена пароля</h2>

        <form @submit.prevent="changePassword" class="profile-form">
          <div>
            <label
              for="current-password"
              class="profile-label profile-label--field"
            >
              Текущий пароль
            </label>
            <div class="password-field" :data-password-tip="PASSWORD_HINT">
              <input
                id="current-password"
                name="currentPassword"
                v-model="currentPassword"
                :type="showCurrentPassword ? 'text' : 'password'"
                placeholder="Введите текущий пароль"
                class="profile-input profile-input--password"
              />
              <button
                type="button"
                class="password-toggle"
                :aria-label="
                  showCurrentPassword ? 'Скрыть пароль' : 'Показать пароль'
                "
                @click="showCurrentPassword = !showCurrentPassword"
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  class="password-icon"
                >
                  <path
                    d="M3 12c0 0 3.5-6.5 9-6.5s9 6.5 9 6.5-3.5 6.5-9 6.5S3 12 3 12Z"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <circle cx="12" cy="12" r="2.4" fill="currentColor" />
                  <line
                    v-if="!showCurrentPassword"
                    x1="4"
                    y1="20"
                    x2="20"
                    y2="4"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                  />
                </svg>
              </button>
            </div>
          </div>

          <div>
            <label
              for="new-password"
              class="profile-label profile-label--field"
            >
              Новый пароль
            </label>
            <div class="password-field" :data-password-tip="PASSWORD_HINT">
              <input
                id="new-password"
                name="newPassword"
                v-model="newPassword"
                :type="showNewPassword ? 'text' : 'password'"
                placeholder="Минимум 6 символов"
                class="profile-input profile-input--password"
              />
              <button
                type="button"
                class="password-toggle"
                :aria-label="
                  showNewPassword ? 'Скрыть пароль' : 'Показать пароль'
                "
                @click="showNewPassword = !showNewPassword"
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  class="password-icon"
                >
                  <path
                    d="M3 12c0 0 3.5-6.5 9-6.5s9 6.5 9 6.5-3.5 6.5-9 6.5S3 12 3 12Z"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <circle cx="12" cy="12" r="2.4" fill="currentColor" />
                  <line
                    v-if="!showNewPassword"
                    x1="4"
                    y1="20"
                    x2="20"
                    y2="4"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                  />
                </svg>
              </button>
            </div>
          </div>

          <div>
            <label
              for="confirm-password"
              class="profile-label profile-label--field"
            >
              Подтвердить пароль
            </label>
            <div class="password-field" :data-password-tip="PASSWORD_HINT">
              <input
                id="confirm-password"
                name="confirmPassword"
                v-model="confirmPassword"
                :type="showConfirmPassword ? 'text' : 'password'"
                placeholder="Повторите новый пароль"
                class="profile-input profile-input--password"
              />
              <button
                type="button"
                class="password-toggle"
                :aria-label="
                  showConfirmPassword ? 'Скрыть пароль' : 'Показать пароль'
                "
                @click="showConfirmPassword = !showConfirmPassword"
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  class="password-icon"
                >
                  <path
                    d="M3 12c0 0 3.5-6.5 9-6.5s9 6.5 9 6.5-3.5 6.5-9 6.5S3 12 3 12Z"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <circle cx="12" cy="12" r="2.4" fill="currentColor" />
                  <line
                    v-if="!showConfirmPassword"
                    x1="4"
                    y1="20"
                    x2="20"
                    y2="4"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                  />
                </svg>
              </button>
            </div>
          </div>

          <button type="submit" class="profile-button profile-button--spaced">
            Изменить пароль
          </button>

          <button
            type="button"
            @click.prevent="deleteAccount"
            class="delete-button"
          >
            Удалить аккаунт
          </button>

          <p class="profile-note">
            Это действие невозможно отменить. Все ваши данные будут удалены.
          </p>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { useAuthStore } from "../stores/authStore";
import { useRouter } from "vue-router";
import { showToast } from "../services/notificationService";
import * as authService from "../services/authService";
import { PASSWORD_HINT, validatePassword } from "../services/passwordService";

const auth = useAuthStore();
const router = useRouter();

const currentPassword = ref("");
const newPassword = ref("");
const confirmPassword = ref("");
const showCurrentPassword = ref(false);
const showNewPassword = ref(false);
const showConfirmPassword = ref(false);

const userFirstName = computed(() => {
  const users = authService.getJSON("users", []);
  const userEmail =
    typeof auth.user === "string" ? auth.user : auth.user?.email;
  const user = users.find((u) => u.email === userEmail);
  return user?.firstName || "";
});

const userLastName = computed(() => {
  const users = authService.getJSON("users", []);
  const userEmail =
    typeof auth.user === "string" ? auth.user : auth.user?.email;
  const user = users.find((u) => u.email === userEmail);
  return user?.lastName || "";
});

const userEmail = computed(() => {
  return typeof auth.user === "string" ? auth.user : auth.user?.email;
});

function changePassword() {
  if (!currentPassword.value || !newPassword.value || !confirmPassword.value) {
    showToast("Заполните все поля");
    return;
  }

  if (newPassword.value !== confirmPassword.value) {
    showToast("Пароли не совпадают");
    return;
  }

  const passwordError = validatePassword(newPassword.value);
  if (passwordError) {
    showToast(passwordError);
    return;
  }

  const success = auth.changePassword(currentPassword.value, newPassword.value);

  if (!success) {
    showToast("Неверный текущий пароль");
    return;
  }

  showToast("Пароль успешно изменён");
  currentPassword.value = "";
  newPassword.value = "";
  confirmPassword.value = "";
}

function deleteAccount() {
  if (confirm("Вы уверены? Это действие невозможно отменить.")) {
    auth.deleteAccount();
    showToast("Аккаунт удалён");
    router.push("/");
  }
}
</script>

<style scoped>
.profile-page {
  min-height: calc(100vh - 140px);
  background-color: var(--background-color);
  padding: 40px 15px;
}

.profile-container {
  max-width: 600px;
  margin: 0 auto;
}

.profile-card {
  background-color: var(--card-background-color);
  border-radius: 16px;
  padding: 30px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid var(--border-color);
}

.profile-card--spaced {
  margin-bottom: 24px;
}

.profile-title,
.profile-section-title {
  font-family: "Poppins", sans-serif;
  font-weight: 700;
  color: var(--text-color);
  margin: 0 0 24px 0;
}

.profile-title {
  font-size: 2rem;
  margin-bottom: 30px;
}

.profile-section-title {
  font-size: 1.5rem;
}

.profile-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.profile-grid--spaced {
  margin-bottom: 30px;
}

.profile-field {
  margin-bottom: 30px;
}

.profile-label {
  font-family: "Roboto", sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--light-text-color);
  margin: 0 0 8px 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.profile-label--field {
  display: block;
  font-weight: 500;
  color: var(--text-color);
  margin-bottom: 6px;
  text-transform: none;
  letter-spacing: 0;
}

.profile-value {
  font-family: "Roboto", sans-serif;
  font-size: 1.1rem;
  color: var(--text-color);
  margin: 0;
  font-weight: 500;
}

.profile-value--break {
  word-break: break-all;
}

.profile-divider {
  height: 1px;
  background-color: var(--border-color);
  margin: 30px 0;
}

.profile-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.profile-input {
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

.profile-input--password {
  padding-right: 52px;
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: textfield;
}

.profile-input--password::-ms-reveal,
.profile-input--password::-ms-clear {
  display: none;
}

.profile-input--password::-webkit-credentials-auto-fill-button,
.profile-input--password::-webkit-password-toggle-button,
.profile-input--password::-webkit-reveal-button {
  display: none !important;
  visibility: hidden;
  pointer-events: none;
}

.password-field {
  position: relative;
}

.password-toggle {
  position: absolute;
  top: 50%;
  right: 12px;
  transform: translateY(-50%);
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: var(--text-color);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0.85;
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.password-icon {
  width: 18px;
  height: 18px;
  color: var(--text-color);
}

.password-toggle:hover {
  opacity: 1;
  transform: translateY(-50%) scale(1.08);
}

.password-toggle:focus-visible {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
  border-radius: 999px;
}

.profile-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(74, 105, 226, 0.1);
}

.profile-button {
  width: 100%;
  padding: 12px;
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: 10px;
  font-family: "Poppins", sans-serif;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.profile-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(74, 105, 226, 0.4);
}

.profile-button:active {
  transform: translateY(0);
}

.profile-button--spaced {
  margin-top: 8px;
}

.delete-button {
  width: 100%;
  padding: 12px;
  background-color: #ef4444;
  color: white;
  border: none;
  border-radius: 10px;
  font-family: "Poppins", sans-serif;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.delete-button:hover {
  background-color: #dc2626;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(239, 68, 68, 0.4);
}

.delete-button:active {
  transform: translateY(0);
}

.profile-note {
  font-family: "Roboto", sans-serif;
  font-size: 0.8rem;
  color: var(--light-text-color);
  margin: 4px 0 0 0;
}

@media (max-width: 640px) {
  .profile-grid {
    grid-template-columns: 1fr;
  }

  .profile-card {
    padding: 24px;
  }

  .profile-title {
    font-size: 1.7rem;
  }

  .profile-section-title {
    font-size: 1.35rem;
  }
}
</style>
