import { getJSON, setJSON, remove } from "./storageService";
import {
  apiRequestJSON,
  clearStoredAuthToken,
  isApiConfigured,
  setStoredAuthToken,
} from "./apiClient";
import { normalizeUserRecord } from "./apiSchema";

const CURRENT_USER_KEY = "currentUser";

function normalizeUser(user) {
  if (!user) return null;

  if (typeof user === "string") {
    return { email: user };
  }

  return normalizeUserRecord(user);
}

function persistCurrentUser(user) {
  const normalizedUser = normalizeUser(user);
  if (!normalizedUser) {
    remove(CURRENT_USER_KEY);
    return null;
  }

  setJSON(CURRENT_USER_KEY, normalizedUser);
  return normalizedUser;
}

export async function registerUser(user) {
  if (isApiConfigured()) {
    const response = await apiRequestJSON("/api/register", {
      method: "POST",
      auth: false,
      body: {
        first_name: user.firstName,
        last_name: user.lastName,
        email: user.email,
        password: user.password,
      },
    });

    if (response?.token) {
      setStoredAuthToken(response.token);
    }

    if (response?.user) {
      persistCurrentUser(response.user);
    }

    return true;
  }

  const users = getJSON("users", []);
  const exists = users.some((u) => u.email === user.email);
  if (exists) {
    return false;
  }

  users.push(user);
  setJSON("users", users);
  return true;
}

export function findUser(email, password) {
  const users = getJSON("users", []);
  return users.find((u) => u.email === email && u.password === password);
}

export async function loginUser(email, password) {
  if (isApiConfigured()) {
    const response = await apiRequestJSON("/api/login", {
      method: "POST",
      auth: false,
      body: { email, password },
    });

    if (response?.token) {
      setStoredAuthToken(response.token);
    }

    const user = normalizeUser(
      response?.user || response?.profile || { email },
    );
    persistCurrentUser(user);
    return user;
  }

  const found = findUser(email, password);
  if (!found) return null;
  persistCurrentUser({
    ...found,
    name: `${found.firstName || ""} ${found.lastName || ""}`.trim(),
  });
  return normalizeUser(found);
}

export function getCurrentUser() {
  return getJSON(CURRENT_USER_KEY, null);
}

export async function fetchCurrentUser() {
  const cachedUser = getCurrentUser();
  if (cachedUser) return normalizeUser(cachedUser);

  if (!isApiConfigured()) {
    return null;
  }

  try {
    const response = await apiRequestJSON("/api/profile", { method: "GET" });
    if (response?.user || response?.profile || response) {
      const user = normalizeUser(response.user || response.profile || response);
      persistCurrentUser(user);
      return user;
    }
  } catch (error) {
    if (error?.status === 401) {
      return null;
    }
    console.error("fetchCurrentUser error:", error);
  }

  return null;
}

export async function logoutUser() {
  if (isApiConfigured()) {
    try {
      await apiRequestJSON("/api/logout", { method: "POST" });
    } catch (error) {
      console.error("logoutUser error:", error);
    }
  }

  remove(CURRENT_USER_KEY);
  clearStoredAuthToken();
}

export async function changePasswordOnServer(currentPassword, newPassword) {
  if (!isApiConfigured()) {
    return false;
  }

  await apiRequestJSON("/api/password", {
    method: "PATCH",
    body: {
      currentPassword,
      newPassword,
      password: newPassword,
    },
  });

  return true;
}

export async function deleteAccountOnServer() {
  if (!isApiConfigured()) {
    return false;
  }

  await apiRequestJSON("/api/account", { method: "DELETE" });
  await logoutUser();
  return true;
}

export { getJSON, setJSON };
