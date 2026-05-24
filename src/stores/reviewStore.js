import { defineStore } from "pinia";
import * as reviewService from "../services/reviewService";

function getReviewId(review) {
  return review?.id || "";
}

function mergeReview(existingReview, nextReview) {
  if (!existingReview) return nextReview;
  if (!nextReview) return existingReview;
  if (
    getReviewId(existingReview) &&
    getReviewId(nextReview) &&
    String(getReviewId(existingReview)) !== String(getReviewId(nextReview))
  ) {
    return nextReview;
  }

  return {
    ...existingReview,
    ...nextReview,
    conference: nextReview.conference || existingReview.conference || null,
    speakerApplication:
      nextReview.speakerApplication ||
      existingReview.speakerApplication ||
      null,
    reviewer: nextReview.reviewer || existingReview.reviewer || null,
    viewerRoles:
      Array.isArray(nextReview.viewerRoles) && nextReview.viewerRoles.length > 0
        ? nextReview.viewerRoles
        : existingReview.viewerRoles || [],
  };
}

function replaceReview(list, review) {
  const reviewId = getReviewId(review);
  if (!reviewId) return list;

  const index = list.findIndex((item) => String(getReviewId(item)) === String(reviewId));
  if (index === -1) return [review, ...list];

  const nextList = [...list];
  nextList[index] = mergeReview(nextList[index], review);
  return nextList;
}

export const useReviewStore = defineStore("reviews", {
  state: () => ({
    reviewerConferences: [],
    reviewerReviews: [],
    visibleReviews: [],
    selectedReview: null,
    selectedVisibleReview: null,
    adminReviews: [],
    isLoadingReviewerConferences: false,
    isLoadingReviewerReviews: false,
    isLoadingVisibleReviews: false,
    isLoadingVisibleReview: false,
    reviewerConferencesError: "",
    isLoadingReview: false,
    isSavingReviewId: null,
    isSubmittingReviewId: null,
    isLoadingAdminReviews: false,
    isAssigningReview: false,
  }),

  actions: {
    async loadReviewerConferences() {
      this.isLoadingReviewerConferences = true;
      this.reviewerConferencesError = "";
      try {
        this.reviewerConferences = await reviewService.getReviewerConferences();
        return this.reviewerConferences;
      } catch (error) {
        this.reviewerConferencesError =
          error?.payload?.message || error?.message || "Не удалось загрузить конференции";
        throw error;
      } finally {
        this.isLoadingReviewerConferences = false;
      }
    },

    async downloadReviewerFile(fileId, fileName) {
      return reviewService.downloadReviewerFile(fileId, fileName);
    },

    async loadReviewerReviews(status = "") {
      this.isLoadingReviewerReviews = true;
      try {
        this.reviewerReviews = await reviewService.getReviewerReviews(status);
        return this.reviewerReviews;
      } finally {
        this.isLoadingReviewerReviews = false;
      }
    },

    async loadReviewerReview(reviewId) {
      this.isLoadingReview = true;
      try {
        const review = await reviewService.getReviewerReview(reviewId);
        this.selectedReview = mergeReview(this.selectedReview, review);
        this.reviewerReviews = replaceReview(this.reviewerReviews, review);
        return this.selectedReview;
      } finally {
        this.isLoadingReview = false;
      }
    },

    async loadVisibleReviews() {
      this.isLoadingVisibleReviews = true;
      try {
        this.visibleReviews = await reviewService.getVisibleReviews();
        return this.visibleReviews;
      } finally {
        this.isLoadingVisibleReviews = false;
      }
    },

    async loadSpeakerVisibleReviews() {
      const reviews = await this.loadVisibleReviews();
      this.visibleReviews = reviews.filter((review) =>
        review?.viewerRoles?.includes("speaker"),
      );
      return this.visibleReviews;
    },

    async loadVisibleReview(reviewId) {
      this.isLoadingVisibleReview = true;
      try {
        const review = await reviewService.getVisibleReview(reviewId);
        this.selectedVisibleReview = mergeReview(
          this.selectedVisibleReview,
          review,
        );
        this.visibleReviews = replaceReview(this.visibleReviews, review);
        return this.selectedVisibleReview;
      } finally {
        this.isLoadingVisibleReview = false;
      }
    },

    async saveDraft(reviewId, payload) {
      this.isSavingReviewId = reviewId;
      try {
        const review = await reviewService.saveReviewerReviewDraft(
          reviewId,
          payload,
        );
        this.selectedReview = mergeReview(this.selectedReview, review);
        this.reviewerReviews = replaceReview(this.reviewerReviews, review);
        return this.selectedReview;
      } finally {
        this.isSavingReviewId = null;
      }
    },

    async submitReview(reviewId, payload) {
      this.isSubmittingReviewId = reviewId;
      try {
        const review = await reviewService.submitReviewerReview(
          reviewId,
          payload,
        );
        this.selectedReview = mergeReview(this.selectedReview, review);
        this.reviewerReviews = replaceReview(this.reviewerReviews, review);
        this.visibleReviews = replaceReview(this.visibleReviews, review);
        return this.selectedReview;
      } finally {
        this.isSubmittingReviewId = null;
      }
    },

    async loadAdminReviews(filters = {}) {
      this.isLoadingAdminReviews = true;
      try {
        this.adminReviews = await reviewService.getAdminReviews(filters);
        return this.adminReviews;
      } finally {
        this.isLoadingAdminReviews = false;
      }
    },

    async assignReview(payload) {
      this.isAssigningReview = true;
      try {
        const review = await reviewService.assignReview(payload);
        this.adminReviews = replaceReview(this.adminReviews, review);
        return review;
      } finally {
        this.isAssigningReview = false;
      }
    },

    clearSelectedReview() {
      this.selectedReview = null;
    },

    clearSelectedVisibleReview() {
      this.selectedVisibleReview = null;
    },

    clear() {
      this.reviewerConferences = [];
      this.reviewerReviews = [];
      this.visibleReviews = [];
      this.selectedReview = null;
      this.selectedVisibleReview = null;
      this.adminReviews = [];
      this.isLoadingReviewerConferences = false;
      this.isLoadingReviewerReviews = false;
      this.isLoadingVisibleReviews = false;
      this.isLoadingVisibleReview = false;
      this.reviewerConferencesError = "";
      this.isLoadingReview = false;
      this.isSavingReviewId = null;
      this.isSubmittingReviewId = null;
      this.isLoadingAdminReviews = false;
      this.isAssigningReview = false;
    },
  },
});
