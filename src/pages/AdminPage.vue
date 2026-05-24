<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useAdminStore } from "../stores/adminStore";
import { useAuthStore } from "../stores/authStore";
import { useConferenceStore } from "../stores/conferenceStore";
import { useReviewStore } from "../stores/reviewStore";
import { useSpeakerStore } from "../stores/speakerStore";
import { showToast } from "../services/notificationService";
import { getApiErrorMessage } from "../services/apiErrorService";

const adminStore = useAdminStore();
const auth = useAuthStore();
const conferenceStore = useConferenceStore();
const reviewStore = useReviewStore();
const speakerStore = useSpeakerStore();
const router = useRouter();

const users = computed(() => adminStore.users);
const applications = computed(() => adminStore.applications);
const reviews = computed(() => reviewStore.adminReviews);
const userToDelete = ref(null);
const rejectionApplication = ref(null);
const rejectionComment = ref("");
const currentUserId = computed(
  () => auth.user?.id || auth.user?.participantId || auth.user?.email || "",
);

const TOPIC_LABELS = {
  technology: "Технологии",
  business: "Бизнес",
  science: "Наука",
  education: "Образование",
  health: "Здоровье",
  arts: "Искусство",
};

const REQUEST_TYPE_LABELS = {
  speaker: "Докладчик",
  reviewer: "Рецензент",
};

const REQUEST_STATUS_LABELS = {
  pending: "На рассмотрении",
  approved: "Подтверждена",
  rejected: "Отклонена",
};

const REVIEW_STATUS_LABELS = {
  assigned: "Назначена",
  draft: "Черновик",
  submitted: "Отправлена",
};

const REVIEW_DECISION_LABELS = {
  approve: "Принять",
  revise: "Доработать",
  reject: "Отклонить",
};

function getUserId(user) {
  return user?.id || user?.participantId || user?.email || "";
}

function isCurrentUser(user) {
  return String(getUserId(user)) === String(currentUserId.value);
}

function getUserName(user) {
  const fullName = `${user?.firstName || ""} ${user?.lastName || ""}`.trim();
  return user?.name || fullName || user?.email || "Пользователь";
}

function getApplicationId(application) {
  return application?.id || "";
}

function getApplicationUser(application) {
  return (
    application?.userName ||
    application?.user?.name ||
    `${application?.firstName || ""} ${application?.lastName || ""}`.trim() ||
    "Пользователь"
  );
}

function getApplicationEmail(application) {
  return application?.userEmail || application?.email || "Email не указан";
}

function getApplicationTypeLabel(application) {
  if (application?.type === "reviewer") {
    return getReviewerScopeLabel(application);
  }

  return (
    REQUEST_TYPE_LABELS[application?.type] || application?.type || "Заявка"
  );
}

function getApplicationStatusLabel(application) {
  return (
    REQUEST_STATUS_LABELS[application?.status] ||
    application?.status ||
    "На рассмотрении"
  );
}

function getApplicationRejectionReason(application) {
  return (
    application?.rejectionReason ||
    application?.statusComment ||
    application?.adminComment ||
    ""
  );
}

function getApplicationConferenceLabel(application) {
  return (
    application?.conferenceName ||
    application?.conference?.name ||
    (application?.conferenceId
      ? `ID ${application.conferenceId}`
      : "Конференция не указана")
  );
}

function getApplicationSectionLabel(application) {
  return (
    application?.sectionName ||
    application?.section?.name ||
    (application?.sectionId ? `ID ${application.sectionId}` : "—")
  );
}

function getTopicLabel(topic) {
  const normalizedTopic = String(topic || "").trim();
  if (!normalizedTopic) return "Тема не указана";
  return TOPIC_LABELS[normalizedTopic] || normalizedTopic;
}

function getApplicationTopicLabel(application) {
  return getTopicLabel(
    application?.topic ||
      application?.conference?.topic ||
      application?.section?.topic,
  );
}

function getReviewerScopeLabel(application) {
  const scope =
    application?.reviewerScope ||
    application?.reviewer_scope ||
    application?.reviewerAccess?.scope ||
    "";
  const appliesToAllConferences =
    application?.appliesToAllConferences ||
    application?.applies_to_all_conferences;
  const sectionName =
    application?.sectionName ||
    application?.section?.name ||
    "";

  if (scope === "global_section" || appliesToAllConferences) {
    return "Рецензент секции во всех конференциях";
  }

  if (scope === "conference") return "Рецензент конференции";
  if (scope === "section" || sectionName) {
    return `Рецензент секции: ${sectionName || "Не указано"}`;
  }

  return "Рецензент";
}

function getApplicationReportTitle(application) {
  return application?.report?.title || application?.reportTitle || "—";
}

function getApplicationFileLabel(application) {
  if (application?.type !== "speaker") return "—";
  return application?.fileName || application?.file?.name || "—";
}

function getApplicationFileUrl(application) {
  return application?.fileUrl || application?.file?.downloadUrl || "";
}

function formatApplicationDate(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function handleAdminError(error, fallback) {
  if (Number(error?.status || 0) === 403) {
    auth.markAdminForbidden();
    adminStore.clear();
    reviewStore.clear();
    showToast("Доступ к админ-разделу запрещен");
    router.replace("/");
    return;
  }

  showToast(getApiErrorMessage(error, fallback));
}

async function loadUsers() {
  try {
    await adminStore.loadUsers();
  } catch (error) {
    handleAdminError(error, "Не удалось загрузить пользователей");
  }
}

async function loadApplications() {
  try {
    await adminStore.loadApplications();
  } catch (error) {
    handleAdminError(error, "Не удалось загрузить заявки");
  }
}

async function loadAdminReviews() {
  try {
    await reviewStore.loadAdminReviews();
  } catch (error) {
    handleAdminError(error, "Не удалось загрузить рецензии");
  }
}

async function loadAdminData() {
  await Promise.all([loadUsers(), loadApplications(), loadAdminReviews()]);
}

function getReviewStatusLabel(review) {
  return REVIEW_STATUS_LABELS[review?.status] || review?.status || "Назначена";
}

function getReviewDecisionLabel(review) {
  return REVIEW_DECISION_LABELS[review?.decision] || "—";
}

function getReviewConferenceLabel(review) {
  return review?.conference?.name || "Конференция не указана";
}

function getReviewTopicLabel(review) {
  return getTopicLabel(
    review?.topic ||
      review?.conference?.topic ||
      review?.speakerApplication?.section?.topic,
  );
}

function getReviewReportTitle(review) {
  return review?.speakerApplication?.report?.title || "—";
}

function getReviewSpeakerName(review) {
  const speaker = review?.speakerApplication?.speaker || {};
  return (
    speaker.name ||
    [speaker.lastName, speaker.firstName, speaker.middleName]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    "Автор не указан"
  );
}

function getReviewReviewerName(review) {
  return review?.reviewer?.name || review?.reviewer?.email || "Рецензент не указан";
}

async function makeAdmin(user) {
  const userId = getUserId(user);
  if (!userId || isCurrentUser(user) || user.role !== "user") return;

  try {
    await adminStore.makeUserAdmin(userId);
    showToast(
      "Пользователь стал администратором. Ему нужно обновить профиль или войти заново.",
      5000,
    );
  } catch (error) {
    handleAdminError(error, "Не удалось изменить роль пользователя");
  }
}

function openDeleteUserModal(user) {
  if (!user || isCurrentUser(user)) return;
  userToDelete.value = user;
}

function closeDeleteUserModal() {
  if (adminStore.deletingUserId !== null) return;
  userToDelete.value = null;
}

async function confirmDeleteUser() {
  const user = userToDelete.value;
  const userId = getUserId(user);
  if (!userId || isCurrentUser(user)) return;

  try {
    await adminStore.deleteUser(userId);
    userToDelete.value = null;
    showToast("Пользователь удален");
  } catch (error) {
    handleAdminError(error, "Не удалось удалить пользователя");
  }
}

async function updateApplication(application, status, comment = "") {
  const applicationId = getApplicationId(application);
  if (!applicationId) return;

  try {
    await adminStore.updateApplication(applicationId, status, comment);
    if (status === "approved" && application?.type === "speaker") {
      await Promise.allSettled([
        speakerStore.loadSpeakers(),
        conferenceStore.loadConferences(),
      ]);
    }
    showToast(
      status === "approved" ? "Заявка подтверждена" : "Заявка отклонена",
    );
    return true;
  } catch (error) {
    if (Number(error?.status || 0) === 409) {
      showToast("Заявка уже создана или уже подтверждена.");
      await loadApplications();
      return false;
    }

    handleAdminError(error, "Не удалось обновить заявку");
  }

  return false;
}

function openRejectModal(application) {
  if (!application) return;
  rejectionApplication.value = application;
  rejectionComment.value = getApplicationRejectionReason(application);
}

function closeRejectModal() {
  if (adminStore.updatingApplicationId !== null) return;
  rejectionApplication.value = null;
  rejectionComment.value = "";
}

async function confirmRejectApplication() {
  const application = rejectionApplication.value;
  const applicationId = getApplicationId(application);
  if (!applicationId) return;

  const comment = rejectionComment.value.trim();
  const success = await updateApplication(application, "rejected", comment);
  if (success) {
    closeRejectModal();
  }
}

onMounted(() => {
  if (!auth.isAdmin) {
    showToast("Админ-раздел доступен только администраторам");
    router.replace("/");
    return;
  }

  loadAdminData();
});
</script>

<template>
  <div class="admin-page">
    <div class="admin-container">
      <div class="admin-header">
        <div>
          <h1 class="page-title admin-title">Админ</h1>
          <p class="page-lead admin-lead">
            Управление пользователями, ролями и заявками платформы
          </p>
        </div>
        <button
          type="button"
          class="admin-refresh"
          :disabled="
            adminStore.isLoading ||
            adminStore.isLoadingApplications ||
            reviewStore.isLoadingAdminReviews
          "
          @click="loadAdminData"
        >
          {{
            adminStore.isLoading ||
            adminStore.isLoadingApplications ||
            reviewStore.isLoadingAdminReviews
              ? "Обновляем..."
              : "Обновить"
          }}
        </button>
      </div>

      <div class="admin-card">
        <div v-if="adminStore.isLoading" class="admin-state">
          Загрузка пользователей...
        </div>

        <div v-else-if="users.length === 0" class="admin-state">
          Пользователи не найдены
        </div>

        <div v-else class="users-list">
          <div v-for="user in users" :key="getUserId(user)" class="user-row">
            <div class="user-main">
              <div class="user-name-row">
                <span class="user-name">{{ getUserName(user) }}</span>
                <span v-if="isCurrentUser(user)" class="current-badge">
                  Это вы
                </span>
              </div>
              <span class="user-email">{{
                user.email || "Email не указан"
              }}</span>
            </div>

            <div class="user-meta">
              <span
                class="role-badge"
                :class="`role-badge--${user.role || 'user'}`"
              >
                {{ user.role || "user" }}
              </span>
              <button
                v-if="user.role === 'user' && !isCurrentUser(user)"
                type="button"
                class="promote-button"
                :disabled="adminStore.updatingUserId === getUserId(user)"
                @click="makeAdmin(user)"
              >
                {{
                  adminStore.updatingUserId === getUserId(user)
                    ? "Повышаем..."
                    : "Сделать админом"
                }}
              </button>
              <button
                v-if="!isCurrentUser(user)"
                type="button"
                class="delete-user-button"
                :disabled="adminStore.deletingUserId === getUserId(user)"
                @click="openDeleteUserModal(user)"
              >
                {{
                  adminStore.deletingUserId === getUserId(user)
                    ? "Deleting..."
                    : "Удалить пользователя"
                }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="admin-section-header">
        <h2 class="admin-section-title">Заявки</h2>
        <button
          type="button"
          class="admin-refresh admin-refresh--small"
          :disabled="adminStore.isLoadingApplications"
          @click="loadApplications"
        >
          {{
            adminStore.isLoadingApplications
              ? "Обновляем..."
              : "Обновить заявки"
          }}
        </button>
      </div>

      <div class="admin-card">
        <div v-if="adminStore.isLoadingApplications" class="admin-state">
          Загрузка заявок...
        </div>

        <div v-else-if="applications.length === 0" class="admin-state">
          Заявки не найдены
        </div>

        <div v-else class="applications-table-wrap">
          <table class="applications-table">
            <thead>
              <tr>
                <th>Пользователь</th>
                <th>Email</th>
                <th>Conference</th>
                <th>Секция</th>
                <th>Тема</th>
                <th>Тип</th>
                <th>Статус</th>
                <th>Дата подачи</th>
                <th>Название доклада</th>
                <th>Файл</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="application in applications"
                :key="getApplicationId(application)"
              >
                <td>{{ getApplicationUser(application) }}</td>
                <td>{{ getApplicationEmail(application) }}</td>
                <td>{{ getApplicationConferenceLabel(application) }}</td>
                <td>{{ getApplicationSectionLabel(application) }}</td>
                <td>{{ getApplicationTopicLabel(application) }}</td>
                <td>
                  <span class="request-type-badge">
                    {{ getApplicationTypeLabel(application) }}
                  </span>
                </td>
                <td>
                  <span
                    class="request-status-badge"
                    :class="`request-status-badge--${application.status || 'pending'}`"
                  >
                    {{ getApplicationStatusLabel(application) }}
                  </span>
                </td>
                <td>{{ formatApplicationDate(application.createdAt) }}</td>
                <td>{{ getApplicationReportTitle(application) }}</td>
                <td>
                  <a
                    v-if="getApplicationFileUrl(application)"
                    :href="getApplicationFileUrl(application)"
                    class="application-file-link"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {{ getApplicationFileLabel(application) }}
                  </a>
                  <span v-else>{{ getApplicationFileLabel(application) }}</span>
                </td>
                <td>
                  <div
                    v-if="(application.status || 'pending') === 'pending'"
                    class="application-actions"
                  >
                    <button
                      type="button"
                      class="approve-button"
                      :disabled="
                        adminStore.updatingApplicationId ===
                        getApplicationId(application)
                      "
                      @click="updateApplication(application, 'approved')"
                    >
                      Подтвердить
                    </button>
                    <button
                      type="button"
                      class="reject-button"
                      :disabled="
                        adminStore.updatingApplicationId ===
                        getApplicationId(application)
                      "
                      @click="openRejectModal(application)"
                    >
                      Отклонить
                    </button>
                  </div>
                  <span
                    v-else
                    class="role-request-state"
                    :class="`request-status-badge--${application.status || 'pending'}`"
                  >
                    {{ getApplicationStatusLabel(application) }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="admin-section-header">
        <h2 class="admin-section-title">Рецензии</h2>
        <button
          type="button"
          class="admin-refresh admin-refresh--small"
          :disabled="reviewStore.isLoadingAdminReviews"
          @click="loadAdminReviews"
        >
          {{
            reviewStore.isLoadingAdminReviews
              ? "Обновляем..."
              : "Обновить рецензии"
          }}
        </button>
      </div>

      <div class="admin-card">
        <div v-if="reviewStore.isLoadingAdminReviews" class="admin-state">
          Загружаем рецензии...
        </div>

        <div v-else-if="reviews.length === 0" class="admin-state">
          Рецензии не найдены
        </div>

        <div v-else class="applications-table-wrap">
          <table class="applications-table reviews-admin-table">
            <thead>
              <tr>
                <th>Рецензент</th>
                <th>Conference</th>
                <th>Тема</th>
                <th>Доклад</th>
                <th>Автор</th>
                <th>Статус</th>
                <th>Оценка</th>
                <th>Решение</th>
                <th>Отправлена</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="review in reviews" :key="review.id">
                <td>{{ getReviewReviewerName(review) }}</td>
                <td>{{ getReviewConferenceLabel(review) }}</td>
                <td>{{ getReviewTopicLabel(review) }}</td>
                <td>{{ getReviewReportTitle(review) }}</td>
                <td>{{ getReviewSpeakerName(review) }}</td>
                <td>
                  <span
                    class="request-status-badge"
                    :class="`request-status-badge--${review.status || 'assigned'}`"
                  >
                    {{ getReviewStatusLabel(review) }}
                  </span>
                </td>
                <td>{{ review.score || "—" }}</td>
                <td>{{ getReviewDecisionLabel(review) }}</td>
                <td>{{ formatApplicationDate(review.submittedAt) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <p class="admin-note">
        После повышения новый администратор должен обновить профиль или войти
        заново, чтобы интерфейс увидел новую роль.
      </p>
    </div>
    <div
      v-if="userToDelete"
      class="admin-modal-overlay"
      @click="closeDeleteUserModal"
    >
      <div class="admin-modal" @click.stop>
        <h2 class="admin-modal-title">Удалить пользователя?</h2>
        <p class="admin-modal-text">
          Пользователь
          <strong>{{ getUserName(userToDelete) }}</strong>
          будет удален. Это действие нельзя отменить.
        </p>
        <p class="admin-modal-email">
          {{ userToDelete.email || "Email не указан" }}
        </p>

        <div class="admin-modal-actions">
          <button
            type="button"
            class="admin-modal-cancel"
            :disabled="adminStore.deletingUserId !== null"
            @click="closeDeleteUserModal"
          >
            Отмена
          </button>
          <button
            type="button"
            class="admin-modal-delete"
            :disabled="adminStore.deletingUserId !== null"
            @click="confirmDeleteUser"
          >
            {{
              adminStore.deletingUserId !== null
                ? "Удаляем..."
                : "Удалить пользователя"
            }}
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="rejectionApplication"
      class="admin-modal-overlay"
      @click="closeRejectModal"
    >
      <div class="admin-modal" @click.stop>
        <h2 class="admin-modal-title">Причина отказа</h2>
        <p class="admin-modal-text">
          Заявка от
          <strong>{{ getApplicationUser(rejectionApplication) }}</strong>
          будет отклонена. Укажите причину, если возможно.
        </p>
        <textarea
          v-model="rejectionComment"
          class="admin-modal-textarea"
          placeholder="Например: Не хватает файла доклада для проверки"
          rows="4"
        ></textarea>
        <p class="admin-modal-help">
          Поле необязательное, но поможет участнику понять, что исправить.
        </p>

        <div class="admin-modal-actions">
          <button
            type="button"
            class="admin-modal-cancel"
            :disabled="adminStore.updatingApplicationId !== null"
            @click="closeRejectModal"
          >
            Отмена
          </button>
          <button
            type="button"
            class="admin-modal-delete"
            :disabled="adminStore.updatingApplicationId !== null"
            @click="confirmRejectApplication"
          >
            {{
              adminStore.updatingApplicationId !== null
                ? "Отклоняем..."
                : "Отклонить заявку"
            }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-page {
  min-height: calc(100vh - 140px);
  background-color: var(--background-color);
  padding: 40px 15px;
}

.admin-container {
  max-width: 980px;
  margin: 0 auto;
}

.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  margin-bottom: 28px;
}

.admin-title {
  margin-bottom: 10px;
}

.admin-lead {
  text-align: left;
  margin: 0;
}

.admin-card {
  background-color: var(--card-background-color);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  box-shadow: 0 8px 28px rgba(20, 24, 40, 0.08);
  overflow: hidden;
}

.admin-card + .admin-section-header {
  margin-top: 28px;
}

.admin-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.admin-section-title {
  margin: 0;
  color: var(--text-color);
  font-family: "Poppins", sans-serif;
  font-size: 1.35rem;
}

.admin-state {
  padding: 34px 24px;
  color: var(--light-text-color);
  text-align: center;
  font-family: "Roboto", sans-serif;
}

.users-list {
  display: flex;
  flex-direction: column;
}

.user-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 18px;
  padding: 18px 20px;
  border-bottom: 1px solid var(--border-color);
}

.user-row:last-child {
  border-bottom: none;
}

.user-main {
  min-width: 0;
}

.user-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.user-name {
  color: var(--text-color);
  font-family: "Poppins", sans-serif;
  font-weight: 700;
}

.user-email {
  display: block;
  margin-top: 4px;
  color: var(--light-text-color);
  font-family: "Roboto", sans-serif;
  font-size: 0.9rem;
  word-break: break-word;
}

.user-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.role-badge,
.current-badge,
.request-type-badge,
.request-status-badge,
.role-request-state {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 5px 10px;
  font-family: "Roboto", sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
}

.role-badge--admin {
  background: rgba(74, 105, 226, 0.14);
  color: var(--primary-color);
}

.role-badge--user,
.current-badge {
  background: rgba(148, 163, 184, 0.16);
  color: var(--text-color);
}

.admin-refresh,
.promote-button,
.delete-user-button,
.approve-button,
.reject-button {
  border: none;
  border-radius: 10px;
  padding: 10px 14px;
  background: var(--primary-color);
  color: #fff;
  font-family: "Poppins", sans-serif;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  transition:
    opacity 0.2s ease,
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.admin-refresh--small {
  padding: 9px 12px;
  font-size: 0.82rem;
}

.admin-refresh:hover,
.promote-button:hover,
.delete-user-button:hover,
.approve-button:hover,
.reject-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(74, 105, 226, 0.22);
}

.admin-refresh:disabled,
.promote-button:disabled,
.delete-user-button:disabled,
.approve-button:disabled,
.reject-button:disabled {
  cursor: not-allowed;
  opacity: 0.68;
  transform: none;
  box-shadow: none;
}

.applications-table-wrap {
  overflow-x: auto;
}

.applications-table {
  width: 100%;
  border-collapse: collapse;
  color: var(--text-color);
  font-family: "Roboto", sans-serif;
  min-width: 1080px;
}

.applications-table th,
.applications-table td {
  border-bottom: 1px solid var(--border-color);
  padding: 12px 14px;
  text-align: left;
  vertical-align: top;
  font-size: 0.88rem;
}

.applications-table th {
  background: rgba(74, 105, 226, 0.08);
  color: var(--text-color);
  font-family: "Poppins", sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
  white-space: nowrap;
}

.applications-table tr:last-child td {
  border-bottom: none;
}

.application-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.application-file-link {
  color: var(--primary-color);
  font-weight: 700;
  text-decoration: none;
}

.application-file-link:hover {
  text-decoration: underline;
}

.request-type-badge {
  background: rgba(74, 105, 226, 0.14);
  color: var(--primary-color);
}

.request-status-badge,
.role-request-state {
  background: rgba(148, 163, 184, 0.16);
  color: var(--text-color);
}

.request-status-badge--approved {
  background: rgba(34, 197, 94, 0.14);
  color: #15803d;
}

.request-status-badge--pending {
  background: rgba(245, 158, 11, 0.16);
  color: #b45309;
}

.request-status-badge--assigned {
  background: rgba(74, 105, 226, 0.14);
  color: var(--primary-color);
}

.request-status-badge--draft {
  background: rgba(245, 158, 11, 0.16);
  color: #b45309;
}

.request-status-badge--submitted {
  background: rgba(34, 197, 94, 0.14);
  color: #15803d;
}

.request-status-badge--rejected {
  background: rgba(239, 68, 68, 0.14);
  color: #dc2626;
}

.approve-button {
  background: #16a34a;
}

.reject-button {
  background: #ef4444;
}

.delete-user-button,
.admin-modal-delete {
  background: #ef4444;
}

.admin-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(15, 23, 42, 0.58);
}

.admin-modal {
  width: min(440px, 100%);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: var(--card-background-color);
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.28);
  padding: 24px;
}

.admin-modal-title {
  margin: 0 0 12px;
  color: var(--text-color);
  font-family: "Poppins", sans-serif;
  font-size: 1.35rem;
}

.admin-modal-text,
.admin-modal-email {
  margin: 0;
  color: var(--text-color);
  font-family: "Roboto", sans-serif;
  line-height: 1.6;
}

.admin-modal-email {
  margin-top: 8px;
  color: var(--light-text-color);
  word-break: break-word;
}

.admin-modal-textarea {
  width: 100%;
  margin-top: 14px;
  padding: 12px 14px;
  border: 2px solid var(--border-color);
  border-radius: 10px;
  background: var(--card-background-color);
  color: var(--text-color);
  font-family: "Roboto", sans-serif;
  font-size: 0.95rem;
  resize: vertical;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.admin-modal-textarea:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(74, 105, 226, 0.12);
}

.admin-modal-help {
  margin: 10px 0 0;
  color: var(--light-text-color);
  font-family: "Roboto", sans-serif;
  font-size: 0.85rem;
}

.admin-modal-actions {
  display: flex;
  gap: 12px;
  margin-top: 22px;
}

.admin-modal-cancel,
.admin-modal-delete {
  flex: 1;
  border: none;
  border-radius: 10px;
  padding: 11px 14px;
  color: #fff;
  font-family: "Poppins", sans-serif;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  transition:
    opacity 0.2s ease,
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.admin-modal-cancel {
  background: var(--border-color);
  color: var(--text-color);
}

.admin-modal-cancel:hover,
.admin-modal-delete:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.18);
}

.admin-modal-cancel:disabled,
.admin-modal-delete:disabled {
  cursor: not-allowed;
  opacity: 0.68;
  transform: none;
  box-shadow: none;
}

.admin-note {
  margin: 16px 0 0;
  color: var(--light-text-color);
  font-family: "Roboto", sans-serif;
  font-size: 0.9rem;
}

@media (max-width: 700px) {
  .admin-header,
  .user-row,
  .user-meta,
  .application-actions,
  .admin-section-header {
    align-items: stretch;
    flex-direction: column;
  }

  .admin-refresh,
  .promote-button,
  .delete-user-button,
  .approve-button,
  .reject-button,
  .admin-modal-cancel,
  .admin-modal-delete {
    width: 100%;
  }

  .applications-table {
    min-width: 980px;
  }

  .admin-modal-actions {
    flex-direction: column;
  }
}
</style>
