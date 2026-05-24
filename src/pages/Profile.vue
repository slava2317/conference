<template>
  <div class="profile-page">
    <div class="profile-container">
      <div class="profile-card profile-card--spaced">
        <h1 class="page-title profile-title">Мой профиль</h1>

        <div class="profile-badges">
          <span class="profile-badge">Роль: {{ userRole }}</span>
        </div>

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

      <div v-if="!isAdmin" class="profile-card profile-card--spaced">
        <div class="profile-section-head">
          <h2 class="profile-section-title">Статусы участия</h2>
          <button
            type="button"
            class="profile-button profile-button--inline"
            @click="goToConferences"
          >
            Выбрать конференцию
          </button>
        </div>

        <div class="profile-status-grid">
          <div
            v-for="roleItem in participationRoles"
            :key="roleItem.type"
            class="profile-status-card"
          >
            <div class="profile-status-header">
              <div>
                <p class="profile-label">{{ roleItem.title }}</p>
                <p
                  class="profile-status-value"
                  :class="`profile-status-value--${roleItem.status}`"
                >
                  {{ roleItem.label }}
                </p>
              </div>
              <span
                class="profile-status-badge"
                :class="`profile-status-badge--${roleItem.status}`"
              >
                {{ roleItem.applications.length }} заявок
              </span>
            </div>

            <p
              v-if="roleItem.applications.length === 0"
              class="profile-status-note"
            >
              {{ roleItem.emptyMessage }}
            </p>

            <div v-else class="profile-application-list">
              <article
                v-for="application in roleItem.applications"
                :key="application.key"
                class="profile-application-item"
              >
                <div class="profile-application-top">
                  <p class="profile-application-title">
                    {{ application.conferenceName }}
                  </p>
                  <span
                    class="profile-status-badge"
                    :class="`profile-status-badge--${application.status}`"
                  >
                    {{ application.statusLabel }}
                  </span>
                </div>

                <div class="profile-application-meta">
                  <span v-if="application.conferenceDateTime">
                    {{ application.conferenceDateTime }}
                  </span>
                  <span v-if="application.reviewerScopeLabel">
                    {{ application.reviewerScopeLabel }}
                  </span>
                  <span
                    v-if="application.sectionName && !application.reviewerScopeLabel"
                  >
                    {{ application.sectionName }}
                  </span>
                  <span v-if="application.reportTitle">
                    Доклад: {{ application.reportTitle }}
                  </span>
                </div>

                <p
                  v-if="
                    application.status === 'rejected' &&
                    application.rejectionReason
                  "
                  class="profile-application-reason"
                >
                  Причина отказа: {{ application.rejectionReason }}
                </p>

                <button
                  v-if="application.status === 'rejected'"
                  type="button"
                  class="profile-button profile-button--compact"
                  @click="applyForConference(application, roleItem.type)"
                >
                  Подать заново
                </button>
              </article>
            </div>

            <button
              type="button"
              class="profile-button profile-button--compact"
              @click="goToConferences"
            >
              {{ roleItem.buttonLabel }}
            </button>
          </div>
        </div>
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
import { ref, computed, onMounted } from "vue";
import { useAuthStore } from "../stores/authStore";
import { useRouter } from "vue-router";
import { showToast } from "../services/notificationService";
import { PASSWORD_HINT, validatePassword } from "../services/passwordService";

const auth = useAuthStore();
const router = useRouter();

const currentPassword = ref("");
const newPassword = ref("");
const confirmPassword = ref("");
const showCurrentPassword = ref(false);
const showNewPassword = ref(false);
const showConfirmPassword = ref(false);

const STATUS_LABELS = {
  none: "Не подана",
  pending: "На рассмотрении",
  approved: "Подтверждена",
  rejected: "Отклонена",
};

const ROLE_CONFIG = {
  speaker: {
    title: "Докладчик",
    emptyMessage: "Вы пока не подавали заявки как докладчик",
    buttonLabel: "Подать заявку как докладчик",
    applicationsField: "speakerApplications",
    statusField: "speakerStatus",
  },
  reviewer: {
    title: "Рецензент",
    emptyMessage: "Вы пока не подавали заявки как рецензент",
    buttonLabel: "Подать заявку как рецензент",
    applicationsField: "reviewerApplications",
    statusField: "reviewerStatus",
  },
};

const userFirstName = computed(() => {
  return auth.user?.firstName || "";
});

const userLastName = computed(() => {
  return auth.user?.lastName || "";
});

const userEmail = computed(() => {
  return auth.user?.email || "";
});

const userRole = computed(() => {
  return auth.user?.role || "user";
});

const isAdmin = computed(() => userRole.value === "admin");

const userIdentifier = computed(() => {
  if (typeof auth.user === "string") return auth.user;
  return auth.user?.id || auth.user?.participantId || auth.user?.email || "";
});

const participationRoles = computed(() => {
  return Object.entries(ROLE_CONFIG).map(([type, config]) => {
    const participation = auth.user?.participation?.[type] || {};
    const fallbackApplications = Array.isArray(
      auth.user?.[config.applicationsField],
    )
      ? auth.user[config.applicationsField]
      : [];
    const applications = Array.isArray(participation.applications)
      ? participation.applications
      : fallbackApplications;
    const preparedApplications = applications.map((application, index) =>
      buildApplicationViewModel(application, type, index),
    );
    const status = normalizeStatus(
      participation.status ||
        auth.user?.[config.statusField] ||
        preparedApplications[0]?.status ||
        "none",
    );

    return {
      type,
      title: config.title,
      status,
      label: STATUS_LABELS[status] || status,
      emptyMessage: config.emptyMessage,
      buttonLabel: config.buttonLabel,
      applications: preparedApplications,
    };
  });
});

function normalizeStatus(status) {
  return STATUS_LABELS[status] ? status : "none";
}

function getConferenceName(application) {
  if (
    application?.reviewerScope === "global_section" ||
    application?.reviewer_scope === "global_section" ||
    application?.appliesToAllConferences ||
    application?.applies_to_all_conferences
  ) {
    return "Все конференции";
  }

  return (
    application?.conference?.name ||
    application?.conferenceName ||
    "Конференция не указана"
  );
}

function getConferenceDateTime(application) {
  const date = application?.conference?.date || "";
  const time = application?.conference?.time || "";

  if (date && time) return `${date} ${time}`;
  return date || time || "";
}

function getSectionName(application) {
  return application?.section?.name || application?.sectionName || "";
}

function getReportTitle(application) {
  return application?.report?.title || application?.reportTitle || "";
}

function getReviewerScopeLabel(application, type = "") {
  if ((application?.type || type) !== "reviewer") return "";

  const scope =
    application?.reviewerScope ||
    application?.reviewer_scope ||
    application?.reviewerAccess?.scope ||
    "";
  const appliesToAllConferences =
    application?.appliesToAllConferences ||
    application?.applies_to_all_conferences;
  const sectionName = getSectionName(application);

  if (scope === "global_section" || appliesToAllConferences) {
    return "Рецензент секции во всех конференциях";
  }

  if (scope === "conference") return "Рецензент конференции";
  if (scope === "section" || sectionName) {
    return `Рецензент секции: ${sectionName || "Не указано"}`;
  }

  return "";
}

function getApplicationRejectionReason(application) {
  return (
    application?.rejectionReason ||
    application?.statusComment ||
    application?.adminComment ||
    ""
  );
}

function buildApplicationViewModel(application, type, index) {
  const status = normalizeStatus(application?.status || "none");
  const rejectionReason = getApplicationRejectionReason(application);

  return {
    ...application,
    key: application?.id || `${type}-${index}`,
    status,
    statusLabel: STATUS_LABELS[status] || application?.statusName || status,
    rejectionReason,
    conferenceId:
      application?.conference?.id || application?.conferenceId || null,
    conferenceName: getConferenceName(application),
    conferenceDateTime: getConferenceDateTime(application),
    sectionName: getSectionName(application),
    reviewerScopeLabel: getReviewerScopeLabel(application, type),
    reportTitle: getReportTitle(application),
  };
}

function goToConferences() {
  router.push("/conferences");
}

function applyForConference(application, type) {
  if (application?.conferenceId) {
    router.push(`/conferences/${application.conferenceId}/apply/${type}`);
    return;
  }

  goToConferences();
}

onMounted(() => {
  auth.refreshProfile().catch((error) => {
    console.error("refreshProfile error:", error);
  });
});

async function changePassword() {
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

  const success = await auth.changePassword(
    currentPassword.value,
    newPassword.value,
  );

  if (!success) {
    showToast("Неверный текущий пароль");
    return;
  }

  showToast("Пароль успешно изменён");
  currentPassword.value = "";
  newPassword.value = "";
  confirmPassword.value = "";
}

async function deleteAccount() {
  if (confirm("Вы уверены? Это действие невозможно отменить.")) {
    await auth.deleteAccount();
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
  max-width: 760px;
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
  font-size: clamp(2rem, 2.4vw, 2.4rem);
  margin-bottom: 30px;
}

.profile-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 0 0 24px;
}

.profile-badge {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(74, 105, 226, 0.1);
  color: var(--text-color);
  font-family: "Roboto", sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
}

.profile-badge--muted {
  background: rgba(148, 163, 184, 0.14);
}

.profile-section-title {
  font-size: 1.5rem;
}

.profile-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}

.profile-section-head .profile-section-title {
  margin: 0;
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

.profile-button--compact {
  width: auto;
  align-self: flex-start;
  margin-top: 14px;
  padding: 10px 14px;
}

.profile-button--inline {
  width: auto;
  flex-shrink: 0;
  padding: 10px 14px;
}

.profile-button:disabled {
  cursor: not-allowed;
  opacity: 0.68;
  transform: none;
  box-shadow: none;
}

.profile-status-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.profile-status-card {
  padding: 18px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: rgba(74, 105, 226, 0.04);
}

.profile-status-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.profile-status-value {
  margin: 0;
  color: var(--text-color);
  font-family: "Poppins", sans-serif;
  font-size: 1.05rem;
  font-weight: 700;
}

.profile-status-value--approved {
  color: #15803d;
}

.profile-status-value--pending {
  color: #b45309;
}

.profile-status-value--rejected {
  color: #dc2626;
}

.profile-status-badge {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 5px 9px;
  background: rgba(148, 163, 184, 0.16);
  color: var(--text-color);
  font-family: "Roboto", sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
}

.profile-status-badge--approved {
  background: rgba(34, 197, 94, 0.14);
  color: #15803d;
}

.profile-status-badge--pending {
  background: rgba(245, 158, 11, 0.16);
  color: #b45309;
}

.profile-status-badge--rejected {
  background: rgba(239, 68, 68, 0.14);
  color: #dc2626;
}

.profile-status-note {
  margin: 14px 0 0;
  color: var(--light-text-color);
  font-family: "Roboto", sans-serif;
  font-size: 0.9rem;
}

.profile-application-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 16px;
}

.profile-application-item {
  padding: 12px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 10px;
  background: var(--card-background-color);
}

.profile-application-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.profile-application-title {
  margin: 0;
  color: var(--text-color);
  font-family: "Poppins", sans-serif;
  font-size: 0.98rem;
  font-weight: 650;
  line-height: 1.35;
}

.profile-application-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
  color: var(--light-text-color);
  font-family: "Roboto", sans-serif;
  font-size: 0.86rem;
}

.profile-application-meta span {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.12);
}

.profile-application-reason {
  margin: 10px 0 0;
  color: #b91c1c;
  font-family: "Roboto", sans-serif;
  font-size: 0.88rem;
  font-weight: 600;
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

  .profile-status-grid {
    grid-template-columns: 1fr;
  }

  .profile-section-head {
    align-items: stretch;
    flex-direction: column;
  }

  .profile-button--inline {
    width: 100%;
  }

  .profile-card {
    padding: 24px;
  }

  .profile-title {
    font-size: clamp(2rem, 2.4vw, 2.4rem);
  }

  .profile-section-title {
    font-size: 1.35rem;
  }
}
</style>
