import { getJSON, setJSON, remove } from "./storageService";

export function registerUser(user) {
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

export function loginUser(email, password) {
  const found = findUser(email, password);
  if (!found) return null;
  setJSON("currentUser", email);
  return email;
}

export function getCurrentUser() {
  return getJSON("currentUser", null);
}

export function logoutUser() {
  remove("currentUser");
}

export { getJSON, setJSON };
