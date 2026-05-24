const DEFAULT_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";
const AUTH_TOKEN_KEY = "token";
const LEGACY_AUTH_TOKEN_KEY = "authToken";
const CURRENT_USER_KEY = "currentUser";

export function isApiConfigured() {
  return Boolean(DEFAULT_API_BASE_URL);
}

export function getApiBaseUrl() {
  return DEFAULT_API_BASE_URL.replace(/\/$/, "");
}

export function normalizeApiPath(path) {
  if (!path) return path;

  try {
    const parsed = new URL(path, window.location.origin);
    if (parsed.origin) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
  } catch (error) {
    // Relative paths and invalid URLs should fall through unchanged.
  }

  return path;
}

function buildUrl(path) {
  const baseUrl = getApiBaseUrl();
  const normalizedPath = normalizeApiPath(path);

  if (!baseUrl) {
    return normalizedPath;
  }

  if (
    normalizedPath === baseUrl ||
    normalizedPath.startsWith(`${baseUrl}/`)
  ) {
    return normalizedPath;
  }

  return `${baseUrl}${
    normalizedPath.startsWith("/") ? normalizedPath : `/${normalizedPath}`
  }`;
}

export function getStoredAuthToken() {
  try {
    return (
      localStorage.getItem(AUTH_TOKEN_KEY) ||
      localStorage.getItem(LEGACY_AUTH_TOKEN_KEY) ||
      ""
    );
  } catch (error) {
    console.error("getStoredAuthToken error:", error);
    return "";
  }
}

export function setStoredAuthToken(token) {
  try {
    if (!token) {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(LEGACY_AUTH_TOKEN_KEY);
      return;
    }

    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.removeItem(LEGACY_AUTH_TOKEN_KEY);
  } catch (error) {
    console.error("setStoredAuthToken error:", error);
  }
}

export function clearStoredAuthToken() {
  setStoredAuthToken("");
}

function clearStoredAuthSession() {
  clearStoredAuthToken();

  try {
    localStorage.removeItem(CURRENT_USER_KEY);
    localStorage.removeItem("user");
  } catch (error) {
    console.error("clearStoredAuthSession error:", error);
  }
}

async function parseResponse(response) {
  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

export async function apiRequest(path, options = {}) {
  if (!isApiConfigured()) {
    throw new Error("API is not configured");
  }

  const {
    method = "GET",
    body,
    headers = {},
    auth = true,
    signal,
    responseType = "json",
  } = options;

  const requestHeaders = { ...headers };
  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;

  if (!requestHeaders.Accept) {
    requestHeaders.Accept = "application/json";
  }

  if (auth) {
    const token = getStoredAuthToken();
    if (token) {
      requestHeaders.Authorization = `Bearer ${token}`;
    }
  }

  if (body && !isFormData && !requestHeaders["Content-Type"]) {
    requestHeaders["Content-Type"] = "application/json";
  }

  const response = await fetch(buildUrl(path), {
    method,
    headers: requestHeaders,
    body:
      body &&
      !isFormData &&
      requestHeaders["Content-Type"] === "application/json"
        ? JSON.stringify(body)
        : body,
    credentials: "omit",
    signal,
  });

  if (!response.ok) {
    const payload = await parseResponse(response);
    const error = new Error(
      payload?.message ||
        payload ||
        `Request failed with status ${response.status}`,
    );
    error.status = response.status;
    error.errors = payload?.errors || null;
    error.payload = payload;

    if (response.status === 401) {
      clearStoredAuthSession();
    }

    throw error;
  }

  if (responseType === "blob") {
    return response.blob();
  }

  if (responseType === "arrayBuffer") {
    return response.arrayBuffer();
  }

  if (responseType === "text") {
    return response.text();
  }

  return parseResponse(response);
}

export async function apiRequestJSON(path, options = {}) {
  return apiRequest(path, options);
}

export async function apiRequestFormData(path, formData, options = {}) {
  return apiRequest(path, {
    ...options,
    body: formData,
  });
}
