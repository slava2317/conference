import { apiRequestJSON } from "./apiClient";
import { normalizeUserRecord } from "./apiSchema";

function extractUsers(response) {
  if (Array.isArray(response)) return response;

  const candidates = [
    response?.data,
    response?.users,
    response?.data?.users,
    response?.data?.items,
    response?.items,
  ];

  return candidates.find((value) => Array.isArray(value)) || [];
}

export async function getAdminUsers() {
  const response = await apiRequestJSON("/admin/users", { method: "GET" });
  return extractUsers(response).map(normalizeUserRecord);
}

export async function updateAdminUserRole(userId, role) {
  const response = await apiRequestJSON(
    `/admin/users/${encodeURIComponent(userId)}/role`,
    {
      method: "PATCH",
      body: { role },
    },
  );

  return response?.user || response?.data || response;
}

export async function deleteAdminUser(userId) {
  await apiRequestJSON(`/admin/users/${encodeURIComponent(userId)}`, {
    method: "DELETE",
  });

  return true;
}
