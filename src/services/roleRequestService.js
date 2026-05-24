import { apiRequestJSON } from "./apiClient";
import { normalizeRoleRequestRecord } from "./apiSchema";

function extractRoleRequests(response) {
  if (Array.isArray(response)) return response;

  const candidates = [
    response?.data,
    response?.roleRequests,
    response?.role_requests,
    response?.requests,
    response?.data?.roleRequests,
    response?.data?.role_requests,
    response?.data?.requests,
    response?.data?.items,
    response?.items,
  ];

  return candidates.find((value) => Array.isArray(value)) || [];
}

function extractRoleRequest(response) {
  return (
    response?.roleRequest ||
    response?.role_request ||
    response?.request ||
    response?.data?.roleRequest ||
    response?.data?.role_request ||
    response?.data?.request ||
    response?.data ||
    response
  );
}

export async function createRoleRequest(type, extraPayload = {}) {
  const response = await apiRequestJSON("/role-requests", {
    method: "POST",
    body: { type, ...extraPayload },
  });

  return normalizeRoleRequestRecord(extractRoleRequest(response));
}

export async function getMyRoleRequests() {
  const response = await apiRequestJSON("/role-requests/my", {
    method: "GET",
  });

  return extractRoleRequests(response).map(normalizeRoleRequestRecord);
}

export async function getAdminRoleRequests(status = "") {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  const response = await apiRequestJSON(`/admin/role-requests${query}`, {
    method: "GET",
  });

  return extractRoleRequests(response).map(normalizeRoleRequestRecord);
}

export async function updateAdminRoleRequest(requestId, status, comment = "") {
  const response = await apiRequestJSON(
    `/admin/role-requests/${encodeURIComponent(requestId)}`,
    {
      method: "PATCH",
      body: { status, comment },
    },
  );

  return normalizeRoleRequestRecord(extractRoleRequest(response));
}
