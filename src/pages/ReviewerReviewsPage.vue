<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/authStore";
import { useReviewStore } from "../stores/reviewStore";
import { showToast } from "../services/notificationService";
import { getApiErrorMessage } from "../services/apiErrorService";

const router = useRouter();
const auth = useAuthStore();
const reviewStore = useReviewStore();

const activeStatus = ref("");
const reviewValidationErrors = ref({});
const reviewForm = ref({
  score: "",
  decision: "",
  comment: "",
});

const canUseReviewerSection = computed(
  () => auth.user?.reviewerStatus === "approved",
);
const reviewerConferences = computed(() => reviewStore.reviewerConferences);
const reviews = computed(() => reviewStore.reviewerReviews);
const selectedReview = computed(() => reviewStore.selectedReview);
const selectedReviewFile = computed(
  () => selectedReview.value?.speakerApplication?.report?.file || null,
);
const selectedReviewCanEdit = computed(() => {
  const review = selectedReview.value;
  if (!review) return false;
  return review.canEdit !== false && review.status !== "submitted";
});

const statusFilters = [
  { value: "", label: "Все" },
  { value: "assigned", label: "Назначены" },
  { value: "draft", label: "Черновики" },
  { value: "submitted", label: "Отправлены" },
];

const REVIEW_STATUS_LABELS = {
  assigned: "Назначена",
  draft: "Черновик",
  submitted: "Отправлена",
};

const DECISION_LABELS = {
  approve: "Принять",
  revise: "Доработать",
  reject: "Отклонить",
};

function getReviewStatusLabel(review) {
  return REVIEW_STATUS_LABELS[review?.status] || review?.status || "Назначена";
}

function getDecisionLabel(decision) {
  return DECISION_LABELS[decision] || "Не выбрано";
}

function getConferenceTitle(review) {
  return review?.conference?.name || "Конференция не указана";
}

function getConferenceDateTime(review) {
  const date = review?.conference?.date || "";
  const time = review?.conference?.time || "";
  if (date && time) return `${date} ${time}`;
  return date || time || "Дата не указана";
}

function getSpeakerName(review) {
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

function getSectionName(review) {
  return review?.speakerApplication?.section?.name || "Секция не указана";
}

function getReportTitle(review) {
  return review?.speakerApplication?.report?.title || "Доклад не указан";
}

function getReportTopic(review) {
  return review?.speakerApplication?.report?.topic || "";
}

function getApplicationInfo(review, field) {
  const info = review?.speakerApplication?.applicationInfo || {};
  return info[field] || "Не указано";
}

function getReviewerConferenceTopic(conference) {
  return conference?.topic || "Тема не указана";
}

function getReviewerConferenceDateTime(conference) {
  const date = conference?.date || "";
  const time = conference?.time || "";
  if (date && time) return `${date} ${time}`;
  return date || time || "Дата не указана";
}

function getReviewerAccessLabel(conference) {
  const scope =
    conference?.reviewerScope ||
    conference?.reviewerAccess?.scope ||
    "";
  const appliesToAllConferences =
    conference?.appliesToAllConferences ||
    conference?.applies_to_all_conferences;

  if (scope === "global_section" || appliesToAllConferences) {
    return "Рецензент секции во всех конференциях";
  }

  if (scope === "conference") return "Рецензент конференции";
  if (scope === "section") return "Рецензент секции";
  return "";
}

function getReviewerConferenceSpeakers(conference) {
  return Array.isArray(conference?.speakers) ? conference.speakers : [];
}

function getReviewerSpeakerName(speaker) {
  return (
    speaker?.name ||
    [speaker?.lastName, speaker?.firstName, speaker?.middleName]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    "Докладчик не указан"
  );
}

function getReviewerSpeakerInfo(speaker, field) {
  return speaker?.[field] || speaker?.applicationInfo?.[field] || "Не указано";
}

function getReviewerAuthorStatus(speaker) {
  return (
    speaker?.authorStatus ||
    speaker?.educationStatus ||
    speaker?.applicationInfo?.authorStatus ||
    speaker?.applicationInfo?.educationStatus ||
    "Не указано"
  );
}

function getReviewerCommentForReviewer(speaker) {
  return (
    speaker?.commentForReviewer ||
    speaker?.reviewerComment ||
    speaker?.applicationInfo?.commentForReviewer ||
    speaker?.applicationInfo?.reviewerComment ||
    "Не указано"
  );
}

function getReviewerReportTitle(speaker) {
  return speaker?.report?.title || speaker?.reportTitle || "Доклад не указан";
}

function getReviewerMaterialFile(speaker) {
  return (
    speaker?.file ||
    speaker?.report?.file ||
    speaker?.applicationInfo?.file ||
    null
  );
}

function canDownloadReviewerMaterial(speaker) {
  const file = getReviewerMaterialFile(speaker);
  return Boolean(file?.downloadUrl || file?.download_url || file?.id);
}

function formatReviewerFileSize(size) {
  const numericSize = Number(size);
  if (!Number.isFinite(numericSize) || numericSize <= 0) return "";

  if (numericSize < 1024) return `${numericSize} Б`;
  if (numericSize < 1024 * 1024) return `${(numericSize / 1024).toFixed(1)} КБ`;
  return `${(numericSize / (1024 * 1024)).toFixed(1)} МБ`;
}

function getReviewerMaterialFileLabel(speaker) {
  const file = getReviewerMaterialFile(speaker);
  return file?.name || file?.originalName || file?.original_name || "";
}

function getReviewerMaterialFileMeta(speaker) {
  const file = getReviewerMaterialFile(speaker);
  return formatReviewerFileSize(file?.size);
}

function getReviewDate(value) {
  if (!value) return "Не указано";
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

function syncForm(review) {
  reviewValidationErrors.value = {};
  reviewForm.value = {
    score: review?.score ?? "",
    decision: review?.decision || "",
    comment: review?.comment || "",
  };
}

function getReviewFieldError(field) {
  return reviewValidationErrors.value[field] || "";
}

function normalizeReviewValidationField(field) {
  const normalizedField = String(field || "")
    .replace(/_([a-z])/g, (_, char) => char.toUpperCase());

  if (["score", "rating"].includes(normalizedField)) return "score";
  if (["decision", "recommendation"].includes(normalizedField)) return "decision";
  if (["comment", "text", "reviewText"].includes(normalizedField)) return "comment";
  return normalizedField;
}

function setReviewValidationErrors(errors = {}) {
  const nextErrors = {};

  Object.entries(errors || {}).forEach(([field, messages]) => {
    const normalizedField = normalizeReviewValidationField(field);
    const message = Array.isArray(messages) ? messages[0] : messages;

    if (normalizedField === "score") {
      nextErrors.score = String(message || "Заполните оценку");
    }

    if (normalizedField === "decision") {
      nextErrors.decision = String(message || "Выберите решение");
    }

    if (normalizedField === "comment") {
      nextErrors.comment = String(message || "Заполните комментарий");
    }
  });

  if (Object.keys(nextErrors).length === 0) {
    nextErrors.score = "Заполните оценку";
    nextErrors.decision = "Выберите решение";
    nextErrors.comment = "Заполните комментарий";
  }

  reviewValidationErrors.value = nextErrors;
}

function validateReviewForm() {
  const payload = buildPayload();
  const nextErrors = {};

  if (!payload.score || payload.score < 1 || payload.score > 10) {
    nextErrors.score = "Укажите оценку от 1 до 10";
  }

  if (!payload.decision) {
    nextErrors.decision = "Выберите решение";
  }

  if (!payload.comment) {
    nextErrors.comment = "Напишите комментарий к рецензии";
  }

  reviewValidationErrors.value = nextErrors;
  return Object.keys(nextErrors).length === 0;
}

function buildPayload() {
  return {
    score:
      reviewForm.value.score === "" || reviewForm.value.score === null
        ? null
        : Number(reviewForm.value.score),
    decision: reviewForm.value.decision || null,
    comment: reviewForm.value.comment?.trim() || null,
  };
}

async function loadReviews() {
  if (!canUseReviewerSection.value) return;

  try {
    await reviewStore.loadReviewerReviews(activeStatus.value);
  } catch (error) {
    showToast(getApiErrorMessage(error, "Не удалось загрузить рецензии"));
  }
}

async function loadReviewerConferences() {
  if (!canUseReviewerSection.value) return;

  try {
    await reviewStore.loadReviewerConferences();
  } catch (error) {
    showToast(
      getApiErrorMessage(error, "Не удалось загрузить конференции для рецензирования"),
    );
  }
}

async function loadReviewerData() {
  await Promise.allSettled([loadReviewerConferences(), loadReviews()]);
}

async function openReview(review) {
  const reviewId = review?.id;
  if (!reviewId) return;

  try {
    const loadedReview = await reviewStore.loadReviewerReview(reviewId);
    syncForm(loadedReview);
  } catch (error) {
    showToast(getApiErrorMessage(error, "Не удалось открыть рецензию"));
  }
}

function closeReview() {
  reviewStore.clearSelectedReview();
}

async function saveDraft() {
  if (!selectedReview.value || !selectedReviewCanEdit.value) return;

  try {
    const savedReview = await reviewStore.saveDraft(
      selectedReview.value.id,
      buildPayload(),
    );
    syncForm(savedReview);
    showToast("Черновик сохранен");
  } catch (error) {
    showToast(getApiErrorMessage(error, "Не удалось сохранить черновик"));
  }
}

async function submitReview() {
  if (!selectedReview.value || !selectedReviewCanEdit.value) return;

  const payload = buildPayload();
  if (!validateReviewForm()) return;

  try {
    const submittedReview = await reviewStore.submitReview(
      selectedReview.value.id,
      payload,
    );
    syncForm(submittedReview);
    showToast("Рецензия отправлена");
  } catch (error) {
    const status = Number(error?.status || 0);

    if (status === 409) {
      showToast("Рецензия уже отправлена", 5000);
      return;
    }

    if (status === 422) {
      setReviewValidationErrors(error?.errors || error?.payload?.errors || {});
      showToast("Проверьте оценку, решение и комментарий", 5000);
      return;
    }

    showToast(getApiErrorMessage(error, "Не удалось отправить рецензию"));
  }
}

async function downloadReportFile(file) {
  if (!file) return;

  if (!file.downloadUrl && !file.download_url && !file.id) {
    showToast("Файл доклада недоступен для скачивания");
    return;
  }

  if (!(await reviewStore.downloadReviewerFile(file, file.name))) {
    showToast("Не удалось скачать файл доклада");
  }
}

async function downloadReviewerMaterial(speaker) {
  const file = getReviewerMaterialFile(speaker);
  if (!file?.downloadUrl && !file?.download_url && !file?.id) return;

  try {
    if (!(await reviewStore.downloadReviewerFile(file, file.name))) {
      showToast("Не удалось скачать материал");
    }
  } catch (error) {
    showToast(getApiErrorMessage(error, "Не удалось скачать материал"));
  }
}

watch(activeStatus, () => {
  loadReviews();
});

watch(selectedReview, (review) => {
  syncForm(review);
});

onMounted(async () => {
  await auth.refreshProfile();

  if (!canUseReviewerSection.value) {
    showToast("Раздел рецензий доступен только подтвержденным рецензентам");
    return;
  }

  loadReviewerData();
});
</script>

<template>
  <div class="reviews-page">
    <div class="reviews-container">
      <div class="reviews-header">
        <div>
          <h1 class="page-title reviews-title">Рецензии</h1>
          <p class="page-lead reviews-lead">
            Назначенные доклады и отправка рецензий
          </p>
        </div>
        <button
          type="button"
          class="reviews-refresh"
          :disabled="
            reviewStore.isLoadingReviewerReviews ||
            reviewStore.isLoadingReviewerConferences
          "
          @click="loadReviewerData"
        >
          {{
            reviewStore.isLoadingReviewerReviews ||
            reviewStore.isLoadingReviewerConferences
              ? "Обновляем..."
              : "Обновить"
          }}
        </button>
      </div>

      <div v-if="!canUseReviewerSection" class="reviews-card reviews-state">
        Раздел доступен только подтвержденным рецензентам.
        <button type="button" class="reviews-link-button" @click="router.push('/profile')">
          Открыть профиль
        </button>
      </div>

      <template v-else>
        <section class="reviewer-conferences-section">
          <div class="reviews-section-header">
            <div>
              <h2 class="reviews-section-title">Конференции на рецензировании</h2>
              <p class="reviews-section-subtitle">
                Доклады и материалы, назначенные вам для рецензирования
              </p>
            </div>
          </div>

          <div
            v-if="reviewStore.isLoadingReviewerConferences"
            class="reviews-card reviews-state reviews-state--loading"
          >
            <span class="reviews-spinner" aria-hidden="true"></span>
            Загружаем конференции...
          </div>

          <div
            v-else-if="reviewStore.reviewerConferencesError"
            class="reviews-card reviews-state reviews-state--error"
          >
            {{ reviewStore.reviewerConferencesError }}
            <button type="button" class="reviews-link-button" @click="loadReviewerConferences">
              Повторить
            </button>
          </div>

          <div
            v-else-if="reviewerConferences.length === 0"
            class="reviews-card reviews-state"
          >
            У вас пока нет конференций для рецензирования
          </div>

          <div v-else class="reviewer-conferences-list">
            <article
              v-for="conference in reviewerConferences"
              :key="conference.id"
              class="reviewer-conference-card"
            >
              <div class="reviewer-conference-header">
                <div>
                  <h3 class="reviewer-conference-title">
                    {{ conference.name || "Конференция без названия" }}
                  </h3>
                  <div class="reviewer-conference-meta">
                    <span>{{ getReviewerConferenceTopic(conference) }}</span>
                    <span>{{ getReviewerConferenceDateTime(conference) }}</span>
                    <span v-if="getReviewerAccessLabel(conference)">
                      {{ getReviewerAccessLabel(conference) }}
                    </span>
                  </div>
                </div>
                <span class="reviewer-speakers-count">
                  {{ getReviewerConferenceSpeakers(conference).length }} докладов
                </span>
              </div>

              <div
                v-if="getReviewerConferenceSpeakers(conference).length === 0"
                class="reviewer-speakers-empty"
              >
                Доклады для этой конференции пока не назначены.
              </div>

              <div v-else class="reviewer-speakers-list">
                <article
                  v-for="speaker in getReviewerConferenceSpeakers(conference)"
                  :key="`${conference.id}-${speaker.id || getReviewerSpeakerName(speaker)}`"
                  class="reviewer-speaker-card"
                >
                  <div class="reviewer-speaker-main">
                    <div>
                      <p class="reviewer-speaker-name">
                        {{ getReviewerSpeakerName(speaker) }}
                      </p>
                      <h4 class="reviewer-report-title">
                        {{ getReviewerReportTitle(speaker) }}
                      </h4>
                      <p
                        v-if="getReviewerMaterialFile(speaker)"
                        class="reviewer-file-name"
                      >
                        {{ getReviewerMaterialFileLabel(speaker) || "Файл доклада" }}
                        <span v-if="getReviewerMaterialFileMeta(speaker)">
                          · {{ getReviewerMaterialFileMeta(speaker) }}
                        </span>
                      </p>
                      <p v-else class="reviewer-file-name">
                        Файл не прикреплен
                      </p>
                    </div>
                    <button
                      type="button"
                      class="reviewer-download-button"
                      :disabled="!canDownloadReviewerMaterial(speaker)"
                      @click="downloadReviewerMaterial(speaker)"
                    >
                      {{
                        canDownloadReviewerMaterial(speaker)
                          ? "Скачать доклад"
                          : "Файл не прикреплен"
                      }}
                    </button>
                  </div>

                  <div class="reviewer-speaker-grid">
                    <div>
                      <span>Организация</span>
                      <strong>{{ getReviewerSpeakerInfo(speaker, "organization") }}</strong>
                    </div>
                    <div>
                      <span>Статус автора</span>
                      <strong>{{ getReviewerAuthorStatus(speaker) }}</strong>
                    </div>
                    <div class="reviewer-speaker-field--full">
                      <span>Комментарии для рецензента</span>
                      <strong>{{ getReviewerCommentForReviewer(speaker) }}</strong>
                    </div>
                  </div>
                </article>
              </div>
            </article>
          </div>
        </section>

        <div class="reviews-section-header reviews-section-header--spaced">
          <div>
            <h2 class="reviews-section-title">Мои рецензии</h2>
            <p class="reviews-section-subtitle">
              Черновики и отправленные рецензии по назначенным докладам
            </p>
          </div>
        </div>

        <div class="reviews-filters">
          <button
            v-for="filter in statusFilters"
            :key="filter.value || 'all'"
            type="button"
            class="reviews-filter"
            :class="{ 'reviews-filter--active': activeStatus === filter.value }"
            @click="activeStatus = filter.value"
          >
            {{ filter.label }}
          </button>
        </div>

        <div v-if="reviewStore.isLoadingReviewerReviews" class="reviews-card reviews-state">
          Загружаем рецензии...
        </div>

        <div v-else-if="reviews.length === 0" class="reviews-card reviews-state">
          Назначенных рецензий пока нет.
        </div>

        <div v-else class="reviews-list">
          <article v-for="review in reviews" :key="review.id" class="review-card">
            <div class="review-card-main">
              <div>
                <p class="review-conference">{{ getConferenceTitle(review) }}</p>
                <h2 class="review-report-title">{{ getReportTitle(review) }}</h2>
                <div class="review-meta">
                  <span>{{ getSpeakerName(review) }}</span>
                  <span>{{ getSectionName(review) }}</span>
                  <span>{{ getConferenceDateTime(review) }}</span>
                </div>
              </div>
              <span
                class="review-status"
                :class="`review-status--${review.status || 'assigned'}`"
              >
                {{ getReviewStatusLabel(review) }}
              </span>
            </div>

            <div class="review-card-footer">
              <span>Оценка: {{ review.score || "не указана" }}</span>
              <span>Решение: {{ getDecisionLabel(review.decision) }}</span>
              <button type="button" class="review-open-button" @click="openReview(review)">
                Открыть
              </button>
            </div>
          </article>
        </div>
      </template>
    </div>

    <div v-if="selectedReview" class="review-modal-overlay" @click="closeReview">
      <div class="review-modal" @click.stop>
        <button type="button" class="review-modal-close" @click="closeReview">
          ✕
        </button>

        <div class="review-modal-header">
          <span
            class="review-status"
            :class="`review-status--${selectedReview.status || 'assigned'}`"
          >
            {{ getReviewStatusLabel(selectedReview) }}
          </span>
          <h2 class="review-modal-title">{{ getReportTitle(selectedReview) }}</h2>
          <p class="review-modal-subtitle">
            {{ getConferenceTitle(selectedReview) }} · {{ getSectionName(selectedReview) }}
          </p>
        </div>

        <div class="review-detail-grid">
          <div class="review-detail-field">
            <span>Автор</span>
            <strong>{{ getSpeakerName(selectedReview) }}</strong>
          </div>
          <div class="review-detail-field">
            <span>Дата конференции</span>
            <strong>{{ getConferenceDateTime(selectedReview) }}</strong>
          </div>
          <div class="review-detail-field">
            <span>Тема доклада</span>
            <strong>{{ getReportTopic(selectedReview) || "Не указано" }}</strong>
          </div>
          <div class="review-detail-field">
            <span>Организация</span>
            <strong>{{ getApplicationInfo(selectedReview, "organization") }}</strong>
          </div>
          <div class="review-detail-field">
            <span>Статус автора</span>
            <strong>{{ getApplicationInfo(selectedReview, "educationStatus") }}</strong>
          </div>
          <div class="review-detail-field">
            <span>Назначена</span>
            <strong>{{ getReviewDate(selectedReview.assignedAt) }}</strong>
          </div>
        </div>

        <div class="review-file-row">
          <span>Файл доклада</span>
          <button
            v-if="selectedReviewFile"
            type="button"
            class="review-file-button"
            @click="downloadReportFile(selectedReviewFile)"
          >
            {{ selectedReviewFile.name || "Скачать файл" }}
          </button>
          <strong v-else>Файл не прикреплен</strong>
        </div>

        <form class="review-form" @submit.prevent="saveDraft">
          <div class="review-form-row">
            <label>
              Оценка
              <input
                v-model="reviewForm.score"
                type="number"
                min="1"
                max="10"
                placeholder="1-10"
                :disabled="!selectedReviewCanEdit"
              />
              <span v-if="getReviewFieldError('score')" class="review-form-error">
                {{ getReviewFieldError("score") }}
              </span>
            </label>

            <label>
              Решение
              <select v-model="reviewForm.decision" :disabled="!selectedReviewCanEdit">
                <option value="">Не выбрано</option>
                <option value="approve">Принять</option>
                <option value="revise">Доработать</option>
                <option value="reject">Отклонить</option>
              </select>
              <span v-if="getReviewFieldError('decision')" class="review-form-error">
                {{ getReviewFieldError("decision") }}
              </span>
            </label>
          </div>

          <label>
            Комментарий
            <textarea
              v-model="reviewForm.comment"
              rows="6"
            placeholder="Комментарий для доклада"
            :readonly="!selectedReviewCanEdit"
          ></textarea>
          <span v-if="getReviewFieldError('comment')" class="review-form-error">
            {{ getReviewFieldError("comment") }}
          </span>
        </label>

          <p v-if="!selectedReviewCanEdit" class="review-readonly-note">
            Рецензия отправлена окончательно и больше не редактируется.
          </p>

          <div class="review-modal-actions">
            <button
              type="submit"
              class="review-save-button"
              :disabled="
                !selectedReviewCanEdit ||
                reviewStore.isSavingReviewId === selectedReview.id
              "
            >
              {{
                reviewStore.isSavingReviewId === selectedReview.id
                  ? "Сохраняем..."
                  : "Сохранить черновик"
              }}
            </button>
            <button
              type="button"
              class="review-submit-button"
              :disabled="
                !selectedReviewCanEdit ||
                reviewStore.isSubmittingReviewId === selectedReview.id
              "
              @click="submitReview"
            >
              {{
                reviewStore.isSubmittingReviewId === selectedReview.id
                  ? "Отправляем..."
                  : "Отправить рецензию"
              }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.reviews-page {
  min-height: calc(100vh - 140px);
  background: var(--background-color);
  padding: 40px 15px;
}

.reviews-container {
  max-width: 1040px;
  margin: 0 auto;
}

.reviews-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 24px;
}

.reviews-title {
  margin-bottom: 10px;
}

.reviews-lead {
  margin: 0;
  text-align: left;
}

.reviews-refresh,
.review-open-button,
.reviews-link-button,
.reviewer-download-button,
.review-save-button,
.review-submit-button {
  border: none;
  border-radius: 10px;
  background: var(--primary-color);
  color: #fff;
  padding: 10px 14px;
  font-family: "Poppins", sans-serif;
  font-weight: 700;
  cursor: pointer;
  transition:
    opacity 0.2s ease,
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.reviews-refresh:hover,
.review-open-button:hover,
.reviews-link-button:hover,
.reviewer-download-button:hover,
.review-save-button:hover,
.review-submit-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(74, 105, 226, 0.22);
}

.reviews-refresh:disabled,
.reviewer-download-button:disabled,
.review-save-button:disabled,
.review-submit-button:disabled {
  cursor: not-allowed;
  opacity: 0.62;
  transform: none;
  box-shadow: none;
}

.reviews-card,
.review-card {
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: var(--card-background-color);
  box-shadow: 0 8px 28px rgba(20, 24, 40, 0.08);
}

.reviews-state {
  padding: 32px 24px;
  color: var(--light-text-color);
  text-align: center;
  font-family: "Roboto", sans-serif;
}

.reviews-state--loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.reviews-state--error {
  color: #dc2626;
}

.reviews-spinner {
  width: 20px;
  height: 20px;
  border: 3px solid rgba(74, 105, 226, 0.16);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: reviews-spin 0.8s linear infinite;
}

@keyframes reviews-spin {
  to {
    transform: rotate(360deg);
  }
}

.reviews-section-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin: 0 0 14px;
}

.reviews-section-header--spaced {
  margin-top: 30px;
}

.reviews-section-title {
  margin: 0;
  color: var(--text-color);
  font-family: "Poppins", sans-serif;
  font-size: 1.35rem;
}

.reviews-section-subtitle {
  margin: 6px 0 0;
  color: var(--light-text-color);
  font-family: "Roboto", sans-serif;
  font-size: 0.92rem;
}

.reviewer-conferences-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.reviewer-conference-card {
  padding: 18px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: var(--card-background-color);
  box-shadow: 0 8px 28px rgba(20, 24, 40, 0.08);
}

.reviewer-conference-card:hover {
  border-color: rgba(74, 105, 226, 0.24);
}

.reviewer-conference-header,
.reviewer-speaker-main {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.reviewer-conference-title,
.reviewer-report-title {
  margin: 0;
  color: var(--text-color);
  font-family: "Poppins", sans-serif;
}

.reviewer-conference-title {
  font-size: 1.25rem;
}

.reviewer-report-title {
  margin-top: 4px;
  font-size: 1.05rem;
}

.reviewer-file-name {
  margin: 8px 0 0;
  color: var(--light-text-color);
  font-family: "Roboto", sans-serif;
  font-size: 0.9rem;
  font-weight: 700;
}

.reviewer-file-name span {
  font-weight: 500;
}

.reviewer-conference-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
  color: var(--light-text-color);
  font-family: "Roboto", sans-serif;
  font-size: 0.9rem;
}

.reviewer-conference-meta span,
.reviewer-speakers-count {
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.12);
}

.reviewer-speakers-count {
  color: var(--primary-color);
  font-family: "Roboto", sans-serif;
  font-size: 0.82rem;
  font-weight: 800;
  white-space: nowrap;
}

.reviewer-speakers-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 16px;
}

.reviewer-speakers-empty {
  margin-top: 16px;
  color: var(--light-text-color);
  font-family: "Roboto", sans-serif;
}

.reviewer-speaker-card {
  padding: 14px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 10px;
  background: rgba(74, 105, 226, 0.04);
}

.reviewer-speaker-card:hover {
  background: rgba(74, 105, 226, 0.07);
}

.reviewer-speaker-name {
  margin: 0;
  color: var(--light-text-color);
  font-family: "Roboto", sans-serif;
  font-weight: 800;
}

.reviewer-speaker-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;
}

.reviewer-speaker-grid div {
  padding: 10px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 10px;
  background: var(--card-background-color);
}

.reviewer-speaker-field--full {
  grid-column: 1 / -1;
}

.reviewer-speaker-grid span {
  display: block;
  margin-bottom: 5px;
  color: var(--light-text-color);
  font-family: "Roboto", sans-serif;
  font-size: 0.78rem;
  font-weight: 800;
  text-transform: uppercase;
}

.reviewer-speaker-grid strong {
  color: var(--text-color);
  font-family: "Roboto", sans-serif;
  line-height: 1.45;
  word-break: break-word;
}

.reviewer-download-button {
  flex-shrink: 0;
}

.reviews-link-button {
  display: block;
  margin: 18px auto 0;
}

.reviews-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 18px;
}

.reviews-filter {
  border: 1px solid var(--border-color);
  border-radius: 999px;
  background: var(--card-background-color);
  color: var(--text-color);
  padding: 8px 12px;
  font-family: "Roboto", sans-serif;
  font-weight: 700;
  cursor: pointer;
}

.reviews-filter--active {
  border-color: var(--primary-color);
  background: rgba(74, 105, 226, 0.1);
  color: var(--primary-color);
}

.reviews-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.review-card {
  padding: 18px;
}

.review-card-main,
.review-card-footer {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.review-conference,
.review-meta,
.review-card-footer,
.review-modal-subtitle,
.review-readonly-note {
  color: var(--light-text-color);
  font-family: "Roboto", sans-serif;
}

.review-conference {
  margin: 0 0 6px;
  font-weight: 700;
}

.review-report-title {
  margin: 0;
  color: var(--text-color);
  font-family: "Poppins", sans-serif;
  font-size: 1.2rem;
}

.review-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
  font-size: 0.9rem;
}

.review-meta span {
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.12);
}

.review-card-footer {
  align-items: center;
  margin-top: 16px;
  font-size: 0.9rem;
}

.review-status {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 5px 10px;
  background: rgba(148, 163, 184, 0.16);
  color: var(--text-color);
  font-family: "Roboto", sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
  white-space: nowrap;
}

.review-status--draft {
  background: rgba(245, 158, 11, 0.16);
  color: #b45309;
}

.review-status--submitted {
  background: rgba(34, 197, 94, 0.14);
  color: #15803d;
}

.review-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(15, 23, 42, 0.58);
}

.review-modal {
  position: relative;
  width: min(760px, 100%);
  max-height: 90vh;
  overflow-y: auto;
  border: 1px solid var(--border-color);
  border-radius: 16px;
  background: var(--card-background-color);
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.28);
  padding: 28px;
}

.review-modal-close {
  position: absolute;
  top: 18px;
  right: 18px;
  border: none;
  background: transparent;
  color: var(--light-text-color);
  font-size: 1.3rem;
  cursor: pointer;
}

.review-modal-header {
  padding-right: 42px;
  margin-bottom: 20px;
}

.review-modal-title {
  margin: 12px 0 6px;
  color: var(--text-color);
  font-family: "Poppins", sans-serif;
  font-size: 1.5rem;
}

.review-modal-subtitle {
  margin: 0;
}

.review-detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.review-detail-field,
.review-file-row {
  padding: 12px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 10px;
  background: rgba(74, 105, 226, 0.04);
}

.review-detail-field span,
.review-file-row span,
.review-form label {
  display: block;
  color: var(--light-text-color);
  font-family: "Roboto", sans-serif;
  font-size: 0.82rem;
  font-weight: 700;
  margin-bottom: 6px;
}

.review-detail-field strong,
.review-file-row strong {
  color: var(--text-color);
  font-family: "Roboto", sans-serif;
  word-break: break-word;
}

.review-file-row {
  margin-bottom: 18px;
}

.review-file-button {
  border: none;
  background: transparent;
  color: var(--primary-color);
  padding: 0;
  font-family: "Roboto", sans-serif;
  font-weight: 800;
  cursor: pointer;
}

.review-file-button:hover {
  text-decoration: underline;
}

.review-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.review-form-row {
  display: grid;
  grid-template-columns: 160px 1fr;
  gap: 14px;
}

.review-form input,
.review-form select,
.review-form textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--card-background-color);
  color: var(--text-color);
  padding: 11px 12px;
  font-family: "Roboto", sans-serif;
  font-size: 0.95rem;
}

.review-form textarea {
  resize: vertical;
}

.review-form-error {
  display: block;
  margin-top: 6px;
  color: #dc2626;
  font-family: "Roboto", sans-serif;
  font-size: 0.82rem;
}

.review-readonly-note {
  margin: 0;
  font-size: 0.9rem;
}

.review-modal-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.review-submit-button {
  background: #16a34a;
}

@media (max-width: 700px) {
  .reviews-header,
  .review-card-main,
  .review-card-footer,
  .review-modal-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .reviews-refresh,
  .review-open-button,
  .reviewer-download-button,
  .review-save-button,
  .review-submit-button {
    width: 100%;
  }

  .review-detail-grid,
  .review-form-row,
  .reviewer-speaker-grid {
    grid-template-columns: 1fr;
  }

  .reviewer-conference-header,
  .reviewer-speaker-main {
    align-items: stretch;
    flex-direction: column;
  }

  .review-modal {
    padding: 24px;
  }
}
</style>
