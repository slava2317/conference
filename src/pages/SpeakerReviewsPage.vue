<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/authStore";
import { useReviewStore } from "../stores/reviewStore";
import { getApiErrorMessage } from "../services/apiErrorService";
import { showToast } from "../services/notificationService";

const auth = useAuthStore();
const reviewStore = useReviewStore();
const router = useRouter();

const reviewsError = ref("");
const speakerReviews = computed(() =>
  reviewStore.visibleReviews.filter((review) =>
    review?.viewerRoles?.includes("speaker"),
  ),
);
const selectedReview = computed(() => reviewStore.selectedVisibleReview);

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
  return REVIEW_STATUS_LABELS[review?.status] || review?.status || "Отправлена";
}

function getDecisionLabel(decision) {
  return DECISION_LABELS[decision] || "Не указано";
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

function getReportTitle(review) {
  return review?.speakerApplication?.report?.title || "Доклад не указан";
}

function getSectionName(review) {
  return review?.speakerApplication?.section?.name || "Секция не указана";
}

function getReviewerName(review) {
  return review?.reviewer?.name || review?.reviewer?.email || "Рецензент";
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

async function loadReviews() {
  reviewsError.value = "";

  try {
    await reviewStore.loadSpeakerVisibleReviews();
  } catch (error) {
    reviewsError.value = getApiErrorMessage(
      error,
      "Не удалось загрузить рецензии на ваши доклады",
    );
  }
}

async function openReview(review) {
  const reviewId = review?.id;
  if (!reviewId) return;

  try {
    const loadedReview = await reviewStore.loadVisibleReview(reviewId);

    if (!loadedReview?.viewerRoles?.includes("speaker")) {
      showToast("Эта рецензия недоступна для просмотра автору");
      closeReview();
    }
  } catch (error) {
    showToast(getApiErrorMessage(error, "Не удалось открыть рецензию"));
  }
}

function closeReview() {
  reviewStore.clearSelectedVisibleReview();
}

onMounted(async () => {
  await auth.refreshProfile();
  loadReviews();
});
</script>

<template>
  <div class="speaker-reviews-page">
    <div class="speaker-reviews-container">
      <div class="speaker-reviews-header">
        <div>
          <h1 class="page-title speaker-reviews-title">Рецензии на мои доклады</h1>
          <p class="page-lead speaker-reviews-lead">
            Отправленные рецензии по вашим докладам
          </p>
        </div>
        <button
          type="button"
          class="speaker-reviews-refresh"
          :disabled="reviewStore.isLoadingVisibleReviews"
          @click="loadReviews"
        >
          {{ reviewStore.isLoadingVisibleReviews ? "Обновляем..." : "Обновить" }}
        </button>
      </div>

      <div
        v-if="reviewStore.isLoadingVisibleReviews"
        class="speaker-reviews-card speaker-reviews-state"
      >
        Загружаем рецензии...
      </div>

      <div
        v-else-if="reviewsError"
        class="speaker-reviews-card speaker-reviews-state speaker-reviews-state--error"
      >
        {{ reviewsError }}
        <button type="button" class="speaker-reviews-link" @click="loadReviews">
          Повторить
        </button>
      </div>

      <div
        v-else-if="speakerReviews.length === 0"
        class="speaker-reviews-card speaker-reviews-state"
      >
        На ваши доклады пока нет отправленных рецензий.
        <button
          type="button"
          class="speaker-reviews-link"
          @click="router.push('/conferences')"
        >
          Открыть конференции
        </button>
      </div>

      <div v-else class="speaker-reviews-list">
        <article
          v-for="review in speakerReviews"
          :key="review.id"
          class="speaker-review-card"
        >
          <div class="speaker-review-main">
            <div>
              <p class="speaker-review-conference">
                {{ getConferenceTitle(review) }}
              </p>
              <h2 class="speaker-review-title">{{ getReportTitle(review) }}</h2>
              <div class="speaker-review-meta">
                <span>{{ getSectionName(review) }}</span>
                <span>{{ getConferenceDateTime(review) }}</span>
                <span>{{ getReviewerName(review) }}</span>
              </div>
            </div>
            <span
              class="speaker-review-status"
              :class="`speaker-review-status--${review.status || 'submitted'}`"
            >
              {{ getReviewStatusLabel(review) }}
            </span>
          </div>

          <div class="speaker-review-summary">
            <span>Оценка: {{ review.score || "не указана" }}</span>
            <span>Решение: {{ getDecisionLabel(review.decision) }}</span>
            <span>Отправлена: {{ getReviewDate(review.submittedAt) }}</span>
            <button
              type="button"
              class="speaker-review-open"
              @click="openReview(review)"
            >
              Открыть
            </button>
          </div>
        </article>
      </div>
    </div>

    <div
      v-if="selectedReview"
      class="speaker-review-modal-overlay"
      @click="closeReview"
    >
      <div class="speaker-review-modal" @click.stop>
        <button
          type="button"
          class="speaker-review-modal-close"
          @click="closeReview"
        >
          x
        </button>

        <div class="speaker-review-modal-header">
          <span
            class="speaker-review-status"
            :class="`speaker-review-status--${selectedReview.status || 'submitted'}`"
          >
            {{ getReviewStatusLabel(selectedReview) }}
          </span>
          <h2 class="speaker-review-modal-title">
            {{ getReportTitle(selectedReview) }}
          </h2>
          <p class="speaker-review-modal-subtitle">
            {{ getConferenceTitle(selectedReview) }} · {{ getSectionName(selectedReview) }}
          </p>
        </div>

        <div class="speaker-review-detail-grid">
          <div class="speaker-review-detail">
            <span>Рецензент</span>
            <strong>{{ getReviewerName(selectedReview) }}</strong>
          </div>
          <div class="speaker-review-detail">
            <span>Отправлена</span>
            <strong>{{ getReviewDate(selectedReview.submittedAt) }}</strong>
          </div>
          <div class="speaker-review-detail">
            <span>Оценка</span>
            <strong>{{ selectedReview.score || "Не указано" }}</strong>
          </div>
          <div class="speaker-review-detail">
            <span>Решение</span>
            <strong>{{ getDecisionLabel(selectedReview.decision) }}</strong>
          </div>
        </div>

        <div class="speaker-review-comment">
          <span>Комментарий</span>
          <p>{{ selectedReview.comment || "Комментарий не указан" }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.speaker-reviews-page {
  min-height: calc(100vh - 140px);
  background: var(--background-color);
  padding: 40px 15px;
}

.speaker-reviews-container {
  max-width: 1040px;
  margin: 0 auto;
}

.speaker-reviews-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 24px;
}

.speaker-reviews-title {
  margin-bottom: 10px;
}

.speaker-reviews-lead {
  margin: 0;
  text-align: left;
}

.speaker-reviews-card,
.speaker-review-card {
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: var(--card-background-color);
  box-shadow: 0 8px 28px rgba(20, 24, 40, 0.08);
}

.speaker-reviews-state {
  padding: 32px 24px;
  color: var(--light-text-color);
  text-align: center;
  font-family: "Roboto", sans-serif;
}

.speaker-reviews-state--error {
  color: #dc2626;
}

.speaker-reviews-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.speaker-review-card {
  padding: 18px;
}

.speaker-review-main,
.speaker-review-summary {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.speaker-review-conference,
.speaker-review-meta,
.speaker-review-summary,
.speaker-review-modal-subtitle {
  color: var(--light-text-color);
  font-family: "Roboto", sans-serif;
}

.speaker-review-conference {
  margin: 0 0 6px;
  font-weight: 700;
}

.speaker-review-title,
.speaker-review-modal-title {
  margin: 0;
  color: var(--text-color);
  font-family: "Poppins", sans-serif;
}

.speaker-review-title {
  font-size: 1.2rem;
}

.speaker-review-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
  font-size: 0.9rem;
}

.speaker-review-meta span {
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.12);
}

.speaker-review-summary {
  align-items: center;
  margin-top: 16px;
  font-size: 0.9rem;
}

.speaker-review-status {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 5px 10px;
  background: rgba(34, 197, 94, 0.14);
  color: #15803d;
  font-family: "Roboto", sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
  white-space: nowrap;
}

.speaker-review-status--draft {
  background: rgba(245, 158, 11, 0.16);
  color: #b45309;
}

.speaker-review-status--assigned {
  background: rgba(148, 163, 184, 0.16);
  color: var(--text-color);
}

.speaker-reviews-refresh,
.speaker-reviews-link,
.speaker-review-open {
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

.speaker-reviews-refresh:hover,
.speaker-reviews-link:hover,
.speaker-review-open:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(74, 105, 226, 0.22);
}

.speaker-reviews-refresh:disabled {
  cursor: not-allowed;
  opacity: 0.62;
  transform: none;
  box-shadow: none;
}

.speaker-reviews-link {
  display: block;
  margin: 18px auto 0;
}

.speaker-review-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(15, 23, 42, 0.58);
}

.speaker-review-modal {
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

.speaker-review-modal-close {
  position: absolute;
  top: 18px;
  right: 18px;
  border: none;
  background: transparent;
  color: var(--light-text-color);
  font-size: 1.3rem;
  cursor: pointer;
}

.speaker-review-modal-header {
  padding-right: 42px;
  margin-bottom: 20px;
}

.speaker-review-modal-title {
  margin: 12px 0 6px;
  font-size: 1.5rem;
}

.speaker-review-modal-subtitle {
  margin: 0;
}

.speaker-review-detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.speaker-review-detail,
.speaker-review-comment {
  padding: 12px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 10px;
  background: rgba(74, 105, 226, 0.04);
}

.speaker-review-detail span,
.speaker-review-comment span {
  display: block;
  margin-bottom: 6px;
  color: var(--light-text-color);
  font-family: "Roboto", sans-serif;
  font-size: 0.82rem;
  font-weight: 700;
}

.speaker-review-detail strong,
.speaker-review-comment p {
  color: var(--text-color);
  font-family: "Roboto", sans-serif;
  line-height: 1.5;
  word-break: break-word;
}

.speaker-review-comment p {
  margin: 0;
}

@media (max-width: 700px) {
  .speaker-reviews-header,
  .speaker-review-main,
  .speaker-review-summary {
    align-items: stretch;
    flex-direction: column;
  }

  .speaker-reviews-refresh,
  .speaker-review-open {
    width: 100%;
  }

  .speaker-review-detail-grid {
    grid-template-columns: 1fr;
  }

  .speaker-review-modal {
    padding: 24px;
  }
}
</style>
