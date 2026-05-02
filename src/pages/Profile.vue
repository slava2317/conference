<template>
  <div class="profile-page">
    <div class="profile-container">
      <div class="profile-card profile-card--spaced">
        <h1 class="profile-title">👤 Мой профиль</h1>

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
        <h2 class="profile-section-title">🔐 Смена пароля</h2>

        <form @submit.prevent="changePassword" class="profile-form">
          <div>
            <label
              for="current-password"
              class="profile-label profile-label--field"
            >
              Текущий пароль
            </label>
            <input
              id="current-password"
              name="currentPassword"
              v-model="currentPassword"
              type="password"
              placeholder="Введите текущий пароль"
              class="profile-input"
            />
          </div>

          <div>
            <label
              for="new-password"
              class="profile-label profile-label--field"
            >
              Новый пароль
            </label>
            <input
              id="new-password"
              name="newPassword"
              v-model="newPassword"
              type="password"
              placeholder="Минимум 6 символов"
              class="profile-input"
            />
          </div>

          <div>
            <label
              for="confirm-password"
              class="profile-label profile-label--field"
            >
              Подтвердить пароль
            </label>
            <input
              id="confirm-password"
              name="confirmPassword"
              v-model="confirmPassword"
              type="password"
              placeholder="Повторите новый пароль"
              class="profile-input"
            />
          </div>

          <button type="submit" class="profile-button profile-button--spaced">
            ✓ Изменить пароль
          </button>

          <button
            type="button"
            @click.prevent="deleteAccount"
            class="delete-button"
          >
            🗑️ Удалить аккаунт
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

const auth = useAuthStore();
const router = useRouter();

const currentPassword = ref("");
const newPassword = ref("");
const confirmPassword = ref("");

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

  if (newPassword.value.length < 6) {
    showToast("Новый пароль должен быть не короче 6 символов");
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
  background: linear-gradient(
    135deg,
    rgba(74, 105, 226, 0.08) 0%,
    rgba(255, 165, 0, 0.05) 100%
  );
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
