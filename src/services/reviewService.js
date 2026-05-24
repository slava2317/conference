import {
  apiRequestJSON,
  getApiBaseUrl,
  getStoredAuthToken,
} from "./apiClient";
import {
  normalizeReviewerConferenceRecord,
  normalizeReviewRecord,
} from "./apiSchema";

function buildQuery(filters = {}) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    params.set(key, String(value));
  });

  const query = params.toString();
  return query ? `?${query}` : "";
}

function extractReviewList(response) {
  if (Array.isArray(response)) return response;

  const candidates = [
    response?.reviews,
    response?.data?.reviews,
    response?.data,
    response?.items,
    response?.data?.items,
  ];

  return candidates.find((value) => Array.isArray(value)) || [];
}

function extractReview(response) {
  return response?.review || response?.data?.review || response?.data || response;
}

function extractConferenceList(response) {
  if (Array.isArray(response)) return response;

  const candidates = [
    response?.conferences,
    response?.data?.conferences,
    response?.data,
    response?.items,
    response?.data?.items,
  ];

  return candidates.find((value) => Array.isArray(value)) || [];
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName || "review-material";
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return true;
}

async function parseDownloadError(response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

function buildDownloadUrl(downloadUrl) {
  const baseUrl = getApiBaseUrl();
  const trimmedBaseUrl = baseUrl.replace(/\/$/, "");
  const path = downloadUrl.startsWith("/") ? downloadUrl : `/${downloadUrl}`;

  try {
    const parsedDownloadUrl = new URL(downloadUrl);
    return parsedDownloadUrl.toString();
  } catch (error) {
    // Relative API paths are joined below.
  }

  try {
    const parsedBaseUrl = new URL(trimmedBaseUrl);
    const basePath = parsedBaseUrl.pathname.replace(/\/$/, "");
    if (basePath && path.startsWith(`${basePath}/`)) {
      return `${parsedBaseUrl.origin}${path}`;
    }

    return `${trimmedBaseUrl}${path}`;
  } catch (error) {
    if (path.startsWith(`${trimmedBaseUrl}/`)) {
      return path;
    }

    return `${trimmedBaseUrl}${path}`;
  }
}

export async function getReviewerConferences() {
  const response = await apiRequestJSON("/reviewer/conferences", {
    method: "GET",
  });

  return extractConferenceList(response).map(normalizeReviewerConferenceRecord);
}

export async function downloadReviewerFile(fileOrId, fileName = "review-material") {
  const file =
    fileOrId && typeof fileOrId === "object"
      ? fileOrId
      : { id: fileOrId, name: fileName };
  const downloadUrl =
    file.downloadUrl ||
    file.download_url ||
    (file.id ? `/reviewer/files/${encodeURIComponent(file.id)}/download` : "");

  if (!downloadUrl) return false;

  const headers = { Accept: "application/json" };
  const token = getStoredAuthToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(buildDownloadUrl(downloadUrl), {
    method: "GET",
    headers,
    credentials: "omit",
  });

  if (!response.ok) {
    const payload = await parseDownloadError(response);
    const error = new Error(
      payload?.message || payload || `Request failed with status ${response.status}`,
    );
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  const blob = await response.blob();

  if (blob instanceof Blob) {
    return downloadBlob(blob, file.name || fileName);
  }

  return false;
}

export async function getReviewerReviews(status = "") {
  const response = await apiRequestJSON(
    `/reviewer/reviews${buildQuery({ status })}`,
    { method: "GET" },
  );

  return extractReviewList(response).map(normalizeReviewRecord);
}

export async function getReviewerReview(reviewId) {
  const response = await apiRequestJSON(
    `/reviewer/reviews/${encodeURIComponent(reviewId)}`,
    { method: "GET" },
  );

  return normalizeReviewRecord(extractReview(response));
}

export async function getVisibleReviews() {
  const response = await apiRequestJSON("/reviews", { method: "GET" });

  return extractReviewList(response).map(normalizeReviewRecord);
}

export async function getVisibleReview(reviewId) {
  const response = await apiRequestJSON(
    `/reviews/${encodeURIComponent(reviewId)}`,
    { method: "GET" },
  );

  return normalizeReviewRecord(extractReview(response));
}

export async function saveReviewerReviewDraft(reviewId, payload) {
  const response = await apiRequestJSON(
    `/reviewer/reviews/${encodeURIComponent(reviewId)}`,
    {
      method: "PATCH",
      body: payload,
    },
  );

  return normalizeReviewRecord(extractReview(response));
}

export async function submitReviewerReview(reviewId, payload) {
  const response = await apiRequestJSON(
    `/reviewer/reviews/${encodeURIComponent(reviewId)}/submit`,
    {
      method: "POST",
      body: payload,
    },
  );

  return normalizeReviewRecord(extractReview(response));
}

export async function getAdminReviews(filters = {}) {
  const response = await apiRequestJSON(
    `/admin/reviews${buildQuery(filters)}`,
    { method: "GET" },
  );

  return extractReviewList(response).map(normalizeReviewRecord);
}

export async function assignReview(payload) {
  const response = await apiRequestJSON("/admin/review-assignments", {
    method: "POST",
    body: payload,
  });

  return normalizeReviewRecord(extractReview(response));
}
