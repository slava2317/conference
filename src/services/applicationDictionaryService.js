import { apiRequestJSON } from "./apiClient";
import { normalizeConferenceSectionRecord } from "./apiSchema";

function extractDictionary(response) {
  return response?.data || response?.dictionary || response || {};
}

function normalizeSectionList(sections) {
  return Array.isArray(sections)
    ? sections.map(normalizeConferenceSectionRecord).filter(Boolean)
    : [];
}

function normalizeSectionsByTopic(sectionsByTopic) {
  if (!sectionsByTopic || typeof sectionsByTopic !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(sectionsByTopic).map(([topic, topicSections]) => [
      topic,
      normalizeSectionList(topicSections),
    ]),
  );
}

function buildDictionaryQuery(filters = {}) {
  const params = new URLSearchParams();
  const normalizedFilters =
    typeof filters === "string" ? { topic: filters } : filters || {};

  if (normalizedFilters.topic) {
    params.set("topic", normalizedFilters.topic);
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}

export async function getApplicationDictionaries(filters = {}) {
  const response = await apiRequestJSON(
    `/application-dictionaries${buildDictionaryQuery(filters)}`,
    {
      method: "GET",
    },
  );
  const dictionary = extractDictionary(response);
  const sections = normalizeSectionList(dictionary.sections);
  const sectionsByTopic = normalizeSectionsByTopic(
    dictionary.sectionsByTopic || dictionary.sections_by_topic,
  );

  return {
    ...dictionary,
    sections,
    sectionsByTopic,
  };
}
