const DEFAULT_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
const AUTH_TOKEN_KEY = "authToken";

export function isApiConfigured() {
  return Boolean(DEFAULT_API_BASE_URL);
}

export function getApiBaseUrl() {
  return DEFAULT_API_BASE_URL.replace(/\/$/, "");
}

function buildUrl(path) {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    return path;
  }

  return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

export function getStoredAuthToken() {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY) || "";
  } catch (error) {
    console.error("getStoredAuthToken error:", error);
    return "";
  }
}

export function setStoredAuthToken(token) {
  try {
    if (!token) {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      return;
    }

    localStorage.setItem(AUTH_TOKEN_KEY, token);
  } catch (error) {
    console.error("setStoredAuthToken error:", error);
  }
}

export function clearStoredAuthToken() {
  setStoredAuthToken("");
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
    credentials: "include",
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
