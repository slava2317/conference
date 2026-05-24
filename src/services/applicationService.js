import { apiRequestJSON } from "./apiClient";
import {
  normalizeApplicationRecord,
  normalizeConferenceSectionRecord,
} from "./apiSchema";

function extractList(response, keys) {
  if (Array.isArray(response)) return response;

  const candidates = keys.flatMap((key) => [
    response?.[key],
    response?.data?.[key],
  ]);

  candidates.push(response?.data, response?.items, response?.data?.items);
  return candidates.find((value) => Array.isArray(value)) || [];
}

function extractApplication(response) {
  return (
    response?.application ||
    response?.data?.application ||
    response?.data ||
    response
  );
}

export async function createConferenceApplication(conferenceId, payload) {
  const response = await apiRequestJSON(
    `/conferences/${encodeURIComponent(conferenceId)}/applications`,
    {
      method: "POST",
      body: payload,
    },
  );

  return normalizeApplicationRecord(extractApplication(response));
}

export async function getAdminApplications() {
  const response = await apiRequestJSON("/admin/applications", {
    method: "GET",
  });

  return extractList(response, ["applications"]).map(normalizeApplicationRecord);
}

export async function updateAdminApplication(applicationId, status, comment = "") {
  const payload = { status };
  const normalizedComment = String(comment || "").trim();
  if (normalizedComment) {
    payload.comment = normalizedComment;
  }

  const response = await apiRequestJSON(
    `/admin/applications/${encodeURIComponent(applicationId)}`,
    {
      method: "PATCH",
      body: payload,
    },
  );

  return normalizeApplicationRecord(extractApplication(response));
}

export function extractEmbeddedConferenceApplications(conference) {
  return Array.isArray(conference?.applications)
    ? conference.applications.map(normalizeApplicationRecord)
    : [];
}

export function getConferenceSectionOptions(conference) {
  return (conference?.sections || [])
    .map((section) => normalizeConferenceSectionRecord(section))
    .filter((section) => section?.id)
    .map((section) => ({
      value: String(section.id),
      label: section.name || `Секция ${section.id}`,
    }));
}
