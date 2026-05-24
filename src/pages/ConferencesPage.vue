<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useConferenceStore } from "../stores/conferenceStore";
import { useAuthStore } from "../stores/authStore";
import { useFileStore } from "../stores/fileStore";
import { showToast } from "../services/notificationService";
import { downloadStoredFile } from "../services/fileContentService";
import { getAnyFileById, getFileById } from "../services/fileService";
import SelectDropdown from "../components/SelectDropdown.vue";
import {
  CONFERENCE_TOPICS,
  CONFERENCE_TOPICS_ARRAY,
} from "../constants/topics";
import { getApiErrorMessage } from "../services/apiErrorService";
import { getApplicationDictionaries } from "../services/applicationDictionaryService";

const conferenceStore = useConferenceStore();
const auth = useAuthStore();
const fileStore = useFileStore();
const route = useRoute();
const router = useRouter();

const conferences = computed(() => conferenceStore.getConferences());
const selectedConference = ref(null);
const selectedSpeaker = ref(null);
const isEditing = ref(false);

function normalizeTopicFilter(topic) {
  return CONFERENCE_TOPICS_ARRAY.some((item) => item.value === topic)
    ? topic
    : "all";
}

const filterTopic = ref(normalizeTopicFilter(route.query.topic));
const filterSectionId = ref(route.query.sectionId ? String(route.query.sectionId) : "all");
const selectedEditFileIds = ref([]);
const editForm = ref(createEmptyEditForm());
const sections = ref([]);
const sectionsByTopic = ref({});
const isLoadingSections = ref(false);
const sectionsError = ref("");
const currentTime = ref(new Date());
let timerId = null;

const topics = CONFERENCE_TOPICS;
const filterOptions = [
  { value: "all", label: "Все темы" },
  ...CONFERENCE_TOPICS_ARRAY,
];
const sectionFilterOptions = computed(() => [
  { value: "all", label: "Все секции" },
  ...getSectionsForTopic(filterTopic.value).map((section) => ({
    value: String(section.id),
    label: section.name || `Секция ${section.id}`,
  })),
]);
const availableFiles = computed(() => fileStore.files || []);
const selectedSpeakerDetailRows = computed(() =>
  selectedSpeaker.value
    ? getSelectedPersonDetailRows(selectedSpeaker.value)
    : [],
);
const selectedSpeakerReportFile = computed(() =>
  auth.isAdmin && selectedSpeaker.value
    ? getSpeakerReportFile(selectedSpeaker.value)
    : null,
);
const selectedPersonSubtitle = computed(() =>
  auth.isAdmin ? "Полная информация из заявки" : "Публичная информация",
);

function getFileSelectionId(file) {
  return String(file?.id || file?.contentId || file?.file_id || "");
}

function getFileKey(file, index) {
  return getFileSelectionId(file) || `${file?.name || "file"}-${index}`;
}
const APPLICATION_STATUS_TEXT = {
  speaker: {
    pending: "Заявка докладчика на рассмотрении",
    approved: "Вы подтверждены как докладчик",
    rejected: "Заявка докладчика отклонена",
  },
  reviewer: {
    pending: "Заявка рецензента на рассмотрении",
    approved: "Вы подтверждены как рецензент",
    rejected: "Заявка рецензента отклонена",
  },
};
const PUBLIC_EMPTY_VALUE = "Не указано";

watch(
  () => route.query.topic,
  (topic) => {
    filterTopic.value = normalizeTopicFilter(topic);
  },
);

watch(
  () => route.query.sectionId,
  (sectionId) => {
    filterSectionId.value = sectionId ? String(sectionId) : "all";
  },
);

watch(filterTopic, () => {
  resetSectionFilterIfNeeded();
});

watch([filterTopic, filterSectionId], () => {
  loadConferencesForFilters();
});

function getCurrentUserEmail() {
  return typeof auth.user === "string" ? auth.user : auth.user?.email || "";
}

function getCurrentUserIdentifier() {
  if (typeof auth.user === "string") return auth.user;
  return auth.user?.id || auth.user?.participantId || auth.user?.email || "";
}

function compactDisplayName(value) {
  if (!value) return "";

  const parts = String(value).trim().split(/\s+/).filter(Boolean);

  if (parts.length <= 1) {
    return parts[0] || "";
  }

  const collapsed = [];
  for (const part of parts) {
    if (collapsed[collapsed.length - 1] !== part) {
      collapsed.push(part);
    }
  }

  return collapsed.join(" ").trim();
}

function getUserDisplayName(user) {
  if (!user) return "—";
  if (typeof user === "string") return compactDisplayName(user) || "—";

  const explicitName = compactDisplayName(user.name);
  if (explicitName) return explicitName;

  const firstName = compactDisplayName(user.firstName);
  const lastName = compactDisplayName(user.lastName);

  if (firstName && lastName) {
    return firstName === lastName ? firstName : `${firstName} ${lastName}`;
  }

  return firstName || lastName || compactDisplayName(user.email) || "—";
}

function getConferenceCreatorLabel(conference) {
  if (!conference?.createdBy) return "—";

  if (typeof conference.createdBy === "object") {
    return getUserDisplayName(conference.createdBy);
  }

  if (typeof conference.createdBy === "string" && auth.user) {
    const currentUserIdentifier = String(getCurrentUserIdentifier());
    if (String(conference.createdBy) === currentUserIdentifier) {
      return getUserDisplayName(auth.user);
    }
  }

  return String(conference.createdBy);
}

function getConferenceFilesCount(conference) {
  return Array.isArray(conference?.usedFiles) ? conference.usedFiles.length : 0;
}

function getConferenceFilterParams() {
  return {
    topic: filterTopic.value === "all" ? "" : filterTopic.value,
    sectionId: filterSectionId.value === "all" ? "" : filterSectionId.value,
  };
}

async function loadApplicationSections() {
  isLoadingSections.value = true;
  sectionsError.value = "";

  try {
    const dictionary = await getApplicationDictionaries();
    sections.value = dictionary.sections || [];
    sectionsByTopic.value = dictionary.sectionsByTopic || {};
    resetSectionFilterIfNeeded();
  } catch (error) {
    sectionsError.value = getApiErrorMessage(
      error,
      "Не удалось загрузить секции",
    );
  } finally {
    isLoadingSections.value = false;
  }
}

function getSectionsForTopic(topic) {
  const topicKey = normalizeTopicFilter(topic);

  if (
    topicKey !== "all" &&
    Object.prototype.hasOwnProperty.call(sectionsByTopic.value, topicKey)
  ) {
    return sectionsByTopic.value[topicKey] || [];
  }

  return sections.value;
}

function resetSectionFilterIfNeeded() {
  if (filterSectionId.value === "all") return;

  const allowedSections = getSectionsForTopic(filterTopic.value);
  const selectedSectionExists = allowedSections.some(
    (section) => String(section?.id) === String(filterSectionId.value),
  );

  if (!selectedSectionExists) {
    filterSectionId.value = "all";
  }
}

async function loadConferencesForFilters() {
  await conferenceStore.loadConferences(getConferenceFilterParams());
  if (auth.isAuthenticated) {
    conferenceStore.loadApplicationsForConferences();
  }
}

function getCurrentUserName() {
  if (typeof auth.user === "object" && auth.user) {
    return `${auth.user.firstName || ""} ${auth.user.lastName || ""}`.trim();
  }
  return getCurrentUserEmail();
}

function isConferenceBooked(conference) {
  return conferenceStore.isBooked(conference?.id, getCurrentUserEmail());
}

function canParticipate(conference) {
  return (
    auth.isAuthenticated &&
    !auth.isAdmin &&
    Boolean(conference) &&
    isConferenceInFuture(conference)
  );
}

function getConferenceApplications(conference) {
  if (!conference?.id) return [];
  return conferenceStore.getApplicationsByConferenceId(conference.id);
}

function getNumericConferenceValue(conference, keys) {
  for (const key of keys) {
    const value = conference?.[key];
    if (value === undefined || value === null || value === "") continue;

    const numericValue = Number(value);
    if (Number.isFinite(numericValue)) return numericValue;
  }

  return null;
}

function getRoleCountFromMaps(conference, type) {
  const sources = [
    conference?.participantCounts,
    conference?.participantsCount,
    conference?.applicationCounts,
    conference?.applicationsCount,
    conference?.counts,
  ].filter((source) => source && typeof source === "object");

  const pluralType = `${type}s`;
  const keys = [type, pluralType, `${type}Count`, `${pluralType}Count`];

  for (const source of sources) {
    const numericValue = getNumericConferenceValue(source, keys);
    if (numericValue !== null) return numericValue;
  }

  return null;
}

function getApprovedApplicationCount(conference, type) {
  return getConferenceApplications(conference).filter((application) => {
    const status = application?.status || "pending";
    return (
      application?.type === type &&
      ["approved", "confirmed", "accepted"].includes(status)
    );
  }).length;
}

function getApplicationByType(conference, type) {
  return [...getConferenceApplications(conference)]
    .filter((application) => application?.type === type)
    .sort((firstApplication, secondApplication) => {
      const firstDate = new Date(firstApplication.createdAt || 0).getTime();
      const secondDate = new Date(secondApplication.createdAt || 0).getTime();
      return secondDate - firstDate;
    })[0];
}

function getApplicationStatus(conference, type) {
  return getApplicationByType(conference, type)?.status || "";
}

function getReviewerApplicationScopeText(application) {
  if (!application || application.type !== "reviewer") return "";

  const scope =
    application.reviewerScope ||
    application.reviewer_scope ||
    application.reviewerAccess?.scope ||
    "";
  const appliesToAllConferences =
    application.appliesToAllConferences ||
    application.applies_to_all_conferences;
  const sectionName =
    application.sectionName ||
    application.section?.name ||
    "";

  if (scope === "global_section" || appliesToAllConferences) {
    return "Рецензент секции во всех конференциях";
  }

  if (scope === "conference") return "Рецензент конференции";
  if (scope === "section" || sectionName) {
    return `Рецензент секции: ${sectionName || "Не указано"}`;
  }

  return "";
}

function getApplicationStatusText(conference, type) {
  const application = getApplicationByType(conference, type);
  const status = application?.status || "";
  const statusText = APPLICATION_STATUS_TEXT[type]?.[status] || "";

  if (type !== "reviewer" || !statusText) return statusText;

  const scopeText = getReviewerApplicationScopeText(application);
  return scopeText ? `${statusText} · ${scopeText}` : statusText;
}

function isApplicationActive(conference, type) {
  return ["pending", "approved"].includes(
    getApplicationStatus(conference, type),
  );
}

function hasOppositeActiveApplication(conference, type) {
  const oppositeType = type === "speaker" ? "reviewer" : "speaker";
  return isApplicationActive(conference, oppositeType);
}

function canApplyForApplication(conference, type) {
  return (
    canParticipate(conference) &&
    !isApplicationActive(conference, type) &&
    !hasOppositeActiveApplication(conference, type)
  );
}

function openApplicationForm(conference, type) {
  if (!auth.isAuthenticated) {
    showToast("Чтобы подать заявку, войдите в аккаунт");
    router.push("/login");
    return;
  }

  if (auth.isAdmin) {
    showToast("Администратор управляет заявками в админ-разделе");
    return;
  }

  if (!isConferenceInFuture(conference)) {
    showToast("Заявку можно подать только на будущую конференцию");
    return;
  }

  if (isApplicationActive(conference, type)) {
    showToast("Вы уже подали такую заявку на эту конференцию");
    return;
  }

  if (hasOppositeActiveApplication(conference, type)) {
    showToast("Нельзя быть докладчиком и рецензентом одновременно");
    return;
  }

  router.push(
    `/conferences/${encodeURIComponent(conference.id)}/apply/${type}`,
  );
}

function getConferenceSpeakers(conference) {
  const speakers = Array.isArray(conference?.speakers)
    ? conference.speakers.filter(Boolean)
    : [];

  if (speakers.length > 0) return speakers;
  return conference?.speaker ? [conference.speaker] : [];
}

function getConferencePeople(conference) {
  if (Array.isArray(conference?.participants)) {
    return conference.participants.filter(Boolean);
  }

  return getConferenceSpeakers(conference);
}

function getConferenceSections(conference) {
  return Array.isArray(conference?.sections)
    ? conference.sections.filter(Boolean)
    : [];
}

function getConferenceSectionIds(conference) {
  return getConferenceSections(conference)
    .map((section) => section?.id)
    .filter((id) => id !== undefined && id !== null && id !== "");
}

function getEditableSections(conference) {
  const topicKey = normalizeTopicFilter(editForm.value.topic || conference?.topic);

  if (
    topicKey !== "all" &&
    Object.prototype.hasOwnProperty.call(sectionsByTopic.value, topicKey)
  ) {
    return sectionsByTopic.value[topicKey] || [];
  }

  return sections.value.length > 0
    ? sections.value
    : getConferenceSections(conference);
}

function getSectionSpeakers(section) {
  return Array.isArray(section?.speakers) ? section.speakers.filter(Boolean) : [];
}

function getSectionSpeakerCount(section) {
  const count = Number(section?.speakerCount ?? section?.speaker_count);
  if (Number.isFinite(count)) return count;
  return getSectionSpeakers(section).length;
}

function getPublicRawValue(...values) {
  for (const value of values) {
    if (value === undefined || value === null) continue;

    if (typeof value === "string") {
      const trimmedValue = value.trim();
      if (trimmedValue) return trimmedValue;
      continue;
    }

    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
  }

  return "";
}

function getPublicValue(...values) {
  return getPublicRawValue(...values) || PUBLIC_EMPTY_VALUE;
}

function getSpeakerApplicationInfo(speaker) {
  const applicationInfo =
    speaker?.applicationInfo ||
    speaker?.application_info ||
    speaker?.speakerApplication ||
    speaker?.speaker_application ||
    speaker?.application ||
    {};

  return applicationInfo && typeof applicationInfo === "object"
    ? applicationInfo
    : {};
}

function getSpeakerFullName(speaker, fallback = PUBLIC_EMPTY_VALUE) {
  const applicationInfo = getSpeakerApplicationInfo(speaker);
  const firstName = compactDisplayName(
    getPublicRawValue(
      applicationInfo.firstName,
      applicationInfo.first_name,
      speaker?.firstName,
      speaker?.first_name,
    ),
  );
  const lastName = compactDisplayName(
    getPublicRawValue(
      applicationInfo.lastName,
      applicationInfo.last_name,
      speaker?.lastName,
      speaker?.last_name,
    ),
  );
  const middleName = compactDisplayName(
    getPublicRawValue(
      applicationInfo.middleName,
      applicationInfo.middle_name,
      speaker?.middleName,
      speaker?.middle_name,
    ),
  );
  const fullName = [lastName, firstName, middleName].filter(Boolean).join(" ");

  return (
    fullName ||
    compactDisplayName(applicationInfo.name) ||
    compactDisplayName(speaker?.name) ||
    fallback
  );
}

function getSpeakerPublicStatus(speaker) {
  const applicationInfo = getSpeakerApplicationInfo(speaker);

  return getPublicValue(
    applicationInfo.educationStatus,
    applicationInfo.education_status,
    applicationInfo.authorStatus,
    applicationInfo.author_status,
    applicationInfo.position,
    applicationInfo.jobPosition,
    applicationInfo.job_position,
    applicationInfo.jobTitle,
    applicationInfo.job_title,
    applicationInfo.occupation,
  );
}

function getSpeakerReportTitle(speaker) {
  const applicationInfo = getSpeakerApplicationInfo(speaker);

  return getPublicValue(
    speaker?.reportTitle,
    speaker?.report_title,
    applicationInfo.reportTitle,
    applicationInfo.report_title,
    speaker?.report?.title,
    applicationInfo.report?.title,
  );
}

function getSpeakerPublicDetailRows(speaker) {
  const applicationInfo = getSpeakerApplicationInfo(speaker);

  return [
    {
      label: "ФИО",
      value: getSpeakerFullName(speaker),
    },
    {
      label: "Страна",
      value: getPublicValue(applicationInfo.country),
    },
    {
      label: "Организация",
      value: getPublicValue(applicationInfo.organization),
    },
    {
      label: "Статус обучения / должность",
      value: getSpeakerPublicStatus(speaker),
    },
    {
      label: "Форма обучения",
      value: getPublicValue(
        applicationInfo.educationForm,
        applicationInfo.education_form,
      ),
    },
    {
      label: "Форма финансирования",
      value: getPublicValue(
        applicationInfo.fundingForm,
        applicationInfo.funding_form,
      ),
    },
    {
      label: "Название доклада",
      value: getSpeakerReportTitle(speaker),
    },
    {
      label: "Дополнительная информация",
      value: getPublicValue(
        applicationInfo.additionalInfo,
        applicationInfo.additional_info,
      ),
    },
  ];
}

function getSelectedPersonDetailRows(person) {
  if (auth.isAdmin) return getAdminPersonDetailRows(person);
  return getPublicPersonDetailRows(person);
}

function getPublicPersonDetailRows(person) {
  return [
    {
      label: "ФИО",
      value: getSpeakerFullName(person),
    },
    {
      label: "Название доклада",
      value: getSpeakerReportTitle(person),
    },
  ];
}

function getPersonTypeLabel(person) {
  const applicationInfo = getSpeakerApplicationInfo(person);
  const type = getPublicRawValue(applicationInfo.type, person?.type);

  if (type === "speaker") return "Докладчик";
  if (type === "reviewer") return "Рецензент";
  return getPublicValue(type);
}

function getPersonSectionLabel(person) {
  const applicationInfo = getSpeakerApplicationInfo(person);
  return getPublicValue(
    applicationInfo.section?.name,
    applicationInfo.sectionName,
    applicationInfo.section_name,
    person?.section?.name,
    person?.sectionName,
    person?.section_name,
    person?.sectionId ? `ID ${person.sectionId}` : "",
  );
}

function getPersonStatusLabel(person) {
  const applicationInfo = getSpeakerApplicationInfo(person);
  return getPublicValue(
    applicationInfo.statusName,
    applicationInfo.status_name,
    person?.statusName,
    person?.status_name,
    applicationInfo.status,
    person?.status,
  );
}

function getPersonSubmittedAtLabel(person) {
  const applicationInfo = getSpeakerApplicationInfo(person);
  const submittedAt = getPublicRawValue(
    applicationInfo.submittedAt,
    applicationInfo.submitted_at,
    person?.submittedAt,
    person?.submitted_at,
    applicationInfo.createdAt,
    applicationInfo.created_at,
    person?.createdAt,
    person?.created_at,
  );

  return submittedAt ? formatBookingDate(submittedAt) : PUBLIC_EMPTY_VALUE;
}

function getAdminPersonDetailRows(person) {
  const applicationInfo = getSpeakerApplicationInfo(person);

  return [
    {
      label: "ФИО",
      value: getSpeakerFullName(person),
    },
    {
      label: "Email",
      value: getPublicValue(applicationInfo.email, person?.email),
    },
    {
      label: "Телефон",
      value: getPublicValue(applicationInfo.phone, person?.phone),
    },
    {
      label: "Страна",
      value: getPublicValue(applicationInfo.country, person?.country),
    },
    {
      label: "Организация",
      value: getPublicValue(applicationInfo.organization, person?.organization),
    },
    {
      label: "Статус / степень / звание",
      value: getPublicValue(
        applicationInfo.educationStatus,
        applicationInfo.education_status,
        applicationInfo.degree,
        person?.degree,
        applicationInfo.academicTitle,
        applicationInfo.academic_title,
        person?.academicTitle,
        person?.academic_title,
      ),
    },
    {
      label: "Форма обучения",
      value: getPublicValue(
        applicationInfo.educationForm,
        applicationInfo.education_form,
      ),
    },
    {
      label: "Форма финансирования",
      value: getPublicValue(
        applicationInfo.fundingForm,
        applicationInfo.funding_form,
      ),
    },
    {
      label: "Название доклада",
      value: getSpeakerReportTitle(person),
    },
    {
      label: "Дополнительная информация",
      value: getPublicValue(
        applicationInfo.additionalInfo,
        applicationInfo.additional_info,
      ),
    },
    {
      label: "Комментарий для рецензента",
      value: getPublicValue(
        applicationInfo.commentForReviewer,
        applicationInfo.comment_for_reviewer,
        person?.commentForReviewer,
        person?.comment_for_reviewer,
      ),
    },
    {
      label: "Секция",
      value: getPersonSectionLabel(person),
    },
    {
      label: "Тип",
      value: getPersonTypeLabel(person),
    },
    {
      label: "Статус заявки",
      value: getPersonStatusLabel(person),
    },
    {
      label: "Дата подачи",
      value: getPersonSubmittedAtLabel(person),
    },
  ];
}

function getSpeakerReportFile(speaker) {
  const applicationInfo = getSpeakerApplicationInfo(speaker);
  const report = applicationInfo.report || speaker?.report || {};
  const rawFile =
    applicationInfo.file || speaker?.file || report.file || null;

  if (rawFile && typeof rawFile === "object") {
    const fileName = getPublicRawValue(
      rawFile.name,
      rawFile.originalName,
      rawFile.original_name,
      applicationInfo.fileName,
      applicationInfo.file_name,
      report.fileName,
      report.file_name,
      "Файл доклада",
    );

    return {
      ...rawFile,
      id:
        rawFile.id || applicationInfo.fileId || applicationInfo.file_id || null,
      name: fileName,
      downloadUrl:
        rawFile.downloadUrl ||
        rawFile.download_url ||
        applicationInfo.fileUrl ||
        applicationInfo.file_url ||
        null,
      contentId: rawFile.contentId || rawFile.content_id || rawFile.id || null,
    };
  }

  if (typeof rawFile === "string" && rawFile.trim()) {
    return {
      id: rawFile,
      name: getPublicRawValue(applicationInfo.fileName, rawFile),
      contentId: rawFile,
    };
  }

  const fileId = getPublicRawValue(
    applicationInfo.fileId,
    applicationInfo.file_id,
    report.fileId,
    report.file_id,
  );
  const fileName = getPublicRawValue(
    applicationInfo.fileName,
    applicationInfo.file_name,
    report.fileName,
    report.file_name,
  );
  const fileUrl = getPublicRawValue(
    applicationInfo.fileUrl,
    applicationInfo.file_url,
    report.fileUrl,
    report.file_url,
  );

  if (!fileId && !fileName && !fileUrl) return null;

  return {
    id: fileId || null,
    name: fileName || "Файл доклада",
    downloadUrl: fileUrl || null,
    contentId: fileId || null,
  };
}

function getSpeakerFileName(file) {
  return getPublicValue(file?.name, file?.originalName, file?.original_name);
}

function canDownloadSpeakerFile(file) {
  return Boolean(
    file?.downloadUrl ||
    file?.id ||
    file?.contentId ||
    file?.content ||
    file?.blob,
  );
}

async function downloadSpeakerReportFile(file) {
  if (!file) return;

  if (!(await downloadStoredFile(file))) {
    showToast("Не удалось скачать файл доклада");
  }
}

function getSpeakerPublicPreview(speaker) {
  const applicationInfo = getSpeakerApplicationInfo(speaker);

  return getPublicRawValue(
    applicationInfo.organization,
    applicationInfo.reportTitle,
    applicationInfo.report_title,
    applicationInfo.report?.title,
    speaker?.bio,
  );
}

function getPersonPreview(person) {
  return auth.isAdmin ? getSpeakerPublicPreview(person) : getSpeakerReportTitle(person);
}

function getSpeakerKey(speaker) {
  return String(
    speaker?.id ||
      speaker?.participantId ||
      speaker?.participant_id ||
      speaker?.email ||
      speaker?.userEmail ||
      speaker?.user_email ||
      getSpeakerFullName(speaker, "") ||
      "",
  );
}

function selectSpeaker(speaker) {
  if (isSpeakerSelected(speaker)) {
    selectedSpeaker.value = null;
    return;
  }

  selectedSpeaker.value = speaker;
}

function clearSelectedSpeaker() {
  selectedSpeaker.value = null;
}

function isSpeakerSelected(speaker) {
  return (
    selectedSpeaker.value === speaker ||
    (getSpeakerKey(selectedSpeaker.value) &&
      getSpeakerKey(selectedSpeaker.value) === getSpeakerKey(speaker))
  );
}

function getConferenceReviewers(conference) {
  const rawReviewers = [
    ...(Array.isArray(conference?.reviewers) ? conference.reviewers : []),
    ...(Array.isArray(conference?.conferenceReviewers)
      ? conference.conferenceReviewers
      : []),
    ...(Array.isArray(conference?.conference_reviewers)
      ? conference.conference_reviewers
      : []),
  ];
  const reviewers = rawReviewers
    .map(
      (reviewer) =>
        reviewer?.reviewer ||
        reviewer?.user ||
        reviewer?.participant ||
        reviewer,
    )
    .filter(Boolean);

  if (reviewers.length > 0) return reviewers;
  return conference?.reviewer ? [conference.reviewer] : [];
}

function getUniquePeopleCount(items) {
  const keys = new Set();
  let anonymousCount = 0;

  items.forEach((item) => {
    const key =
      item?.id ||
      item?.participantId ||
      item?.email ||
      item?.userEmail ||
      item?.name ||
      `${item?.firstName || ""}|${item?.lastName || ""}`;

    if (!key) {
      anonymousCount += 1;
      return;
    }

    keys.add(String(key));
  });

  return keys.size + anonymousCount;
}

function getConferenceSpeakersCount(conference) {
  const explicitCount =
    getNumericConferenceValue(conference, [
      "speakerCount",
      "speakersCount",
      "speaker_count",
      "speakers_count",
      "approvedSpeakerCount",
      "approved_speaker_count",
      "approvedSpeakersCount",
      "approved_speakers_count",
    ]) ?? getRoleCountFromMaps(conference, "speaker");

  if (explicitCount !== null) return explicitCount;

  const sectionsCount = getConferenceSections(conference).reduce(
    (total, section) => total + getSectionSpeakerCount(section),
    0,
  );
  if (sectionsCount > 0) return sectionsCount;

  const speakersCount = getUniquePeopleCount(getConferenceSpeakers(conference));
  return Math.max(
    speakersCount,
    getApprovedApplicationCount(conference, "speaker"),
  );
}

function getConferenceReviewersCount(conference) {
  const explicitCount =
    getNumericConferenceValue(conference, [
      "reviewerCount",
      "reviewersCount",
      "reviewer_count",
      "reviewers_count",
      "approvedReviewerCount",
      "approved_reviewer_count",
      "approvedReviewersCount",
      "approved_reviewers_count",
    ]) ?? getRoleCountFromMaps(conference, "reviewer");

  if (explicitCount !== null) return explicitCount;

  const reviewersCount = getUniquePeopleCount(
    getConferenceReviewers(conference),
  );
  return Math.max(
    reviewersCount,
    getApprovedApplicationCount(conference, "reviewer"),
  );
}

function getConferenceParticipantsSummary(conference) {
  return `Докладчики: ${getConferenceSpeakersCount(conference)} · Рецензенты: ${getConferenceReviewersCount(conference)}`;
}

function getPrimarySpeaker(conference) {
  return getConferenceSpeakers(conference)[0] || null;
}

function getSpeakerDisplayNameFromSpeaker(speaker) {
  if (!speaker) return "";
  return getSpeakerFullName(speaker, "Докладчик");
}

function getSpeakerDisplayName(conference) {
  const speakers = getConferenceSpeakers(conference);
  if (speakers.length === 0) {
    return "Докладчики пока не назначены";
  }

  return speakers.map(getSpeakerDisplayNameFromSpeaker).join(", ");
}

function getSpeakerInitials(speaker) {
  if (!speaker) return "?";

  const applicationInfo = getSpeakerApplicationInfo(speaker);
  const firstName = compactDisplayName(
    getPublicRawValue(
      applicationInfo.firstName,
      applicationInfo.first_name,
      speaker.firstName,
      speaker.name,
    ),
  );
  const lastName = compactDisplayName(
    getPublicRawValue(
      applicationInfo.lastName,
      applicationInfo.last_name,
      speaker.lastName,
    ),
  );
  const initials = `${lastName?.[0] || ""}${firstName?.[0] || ""}`.trim();

  return initials || "?";
}

function getSpeakerMeta(conference) {
  const speakers = getConferenceSpeakers(conference);
  if (speakers.length === 0) return "";
  if (speakers.length === 1) return getSpeakerPublicPreview(speakers[0]);

  return `${speakers.length} докладч.`;
}

function getConferenceBookingsCount(conference) {
  return Array.isArray(conference?.bookings) ? conference.bookings.length : 0;
}

function getConferenceBookings(conference) {
  return Array.isArray(conference?.bookings) ? conference.bookings : [];
}

function formatBookingDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function isConferenceInFuture(conference) {
  const conferenceDate = parseConferenceDate(conference);
  return conferenceDate
    ? conferenceDate.getTime() > currentTime.value.getTime()
    : false;
}

function getConferenceSortValue(conference) {
  const conferenceDate = parseConferenceDate(conference);
  return conferenceDate ? conferenceDate.getTime() : Number.MAX_SAFE_INTEGER;
}

const filteredConferences = computed(() => {
  const baseList = conferences.value.filter((conf) => {
    const matchesTopic =
      filterTopic.value === "all" || conf?.topic === filterTopic.value;
    const matchesSection =
      filterSectionId.value === "all" ||
      (conf?.sections || []).some(
        (section) => String(section?.id) === String(filterSectionId.value),
      );

    return matchesTopic && matchesSection;
  });

  return [...baseList].sort((firstConference, secondConference) => {
    const firstStatus =
      getConferenceStatus(firstConference).variant === "new" ? 0 : 1;
    const secondStatus =
      getConferenceStatus(secondConference).variant === "new" ? 0 : 1;

    if (firstStatus !== secondStatus) {
      return firstStatus - secondStatus;
    }

    return (
      getConferenceSortValue(firstConference) -
      getConferenceSortValue(secondConference)
    );
  });
});

onMounted(async () => {
  await Promise.allSettled([
    loadApplicationSections(),
    conferenceStore.loadConferences(getConferenceFilterParams()),
  ]);
  if (auth.isAuthenticated) {
    fileStore.loadFiles();
    conferenceStore.loadApplicationsForConferences();
  }
  timerId = window.setInterval(() => {
    currentTime.value = new Date();
  }, 1000);
});

onBeforeUnmount(() => {
  if (timerId !== null) {
    window.clearInterval(timerId);
    timerId = null;
  }
});

function createEmptyEditForm(conference = {}) {
  return {
    name: conference.name || "",
    description: conference.description || "",
    topic: conference.topic || "technology",
    date: conference.date || "",
    time: conference.time || "",
    sectionIds: getConferenceSectionIds(conference),
  };
}

function formatFileSize(bytes) {
  if (typeof bytes !== "number") return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function parseConferenceDate(conference) {
  if (!conference?.date) return null;
  const timePart = conference.time || "00:00";
  const parsed = new Date(`${conference.date}T${timePart}:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getConferenceStatus(conference) {
  const conferenceDate = parseConferenceDate(conference);
  if (!conferenceDate) return { label: "Новая", variant: "new" };
  return conferenceDate < new Date()
    ? { label: "Завершена", variant: "finished" }
    : { label: "Новая", variant: "new" };
}

function getConferenceCountdown(conference) {
  const conferenceDate = parseConferenceDate(conference);
  if (!conferenceDate) return "Таймер недоступен";

  const diff = conferenceDate.getTime() - currentTime.value.getTime();
  if (diff <= 0) return "";

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  const parts = [];
  if (days > 0) parts.push(`${days}д`);
  if (hours > 0 || parts.length > 0)
    parts.push(`${String(hours).padStart(2, "0")}ч`);
  parts.push(`${String(minutes).padStart(2, "0")}м`);

  return `До начала: ${parts.join(" ")}`;
}

async function bookConference(conference) {
  if (!auth.isAuthenticated) {
    showToast("Чтобы записаться, войдите в аккаунт");
    return;
  }

  if (!isConferenceInFuture(conference)) {
    showToast("Запись доступна только для будущих конференций");
    return;
  }

  const email = getCurrentUserEmail();
  const booking = await conferenceStore.bookConference(conference.id, {
    email,
    name: getCurrentUserName(),
  });

  if (!booking) {
    showToast("Вы уже записаны на эту конференцию");
    return;
  }

  selectedConference.value = conferenceStore.getConferenceById(conference.id);
  showToast("Вы записаны на конференцию. Напоминание придет за час до начала.");
}

async function cancelConferenceBooking(conference) {
  if (!auth.isAuthenticated) return;

  const email = getCurrentUserEmail();
  const removed = await conferenceStore.cancelBooking(conference.id, email);
  if (!removed) {
    showToast("Не удалось отменить запись");
    return;
  }

  selectedConference.value = conferenceStore.getConferenceById(conference.id);
  showToast("Запись отменена");
}

function canDeleteConference(conference) {
  return auth.isAuthenticated && auth.isAdmin && Boolean(conference);
}

function canManageConference(conference) {
  return canDeleteConference(conference);
}

async function deleteConference(id) {
  const conference = conferences.value.find((conf) => conf?.id === id);
  if (!conference) {
    showToast("Конференция не найдена");
    return;
  }
  if (!canDeleteConference(conference)) {
    showToast("Вы не можете удалить чужую конференцию");
    return;
  }
  if (confirm("Удалить эту конференцию?")) {
    try {
      await conferenceStore.deleteConference(id);
      selectedConference.value = null;
      selectedSpeaker.value = null;
      isEditing.value = false;
      showToast("Конференция удалена");
    } catch (error) {
      if (Number(error?.status || 0) === 403) {
        showToast(
          "Недостаточно прав. Создавать и удалять конференции может только администратор.",
        );
      } else {
        showToast(getApiErrorMessage(error, "Не удалось удалить конференцию"));
      }
      console.error("deleteConference error:", error);
    }
  }
}

function toggleEditFileSelection(file) {
  const fileId = getFileSelectionId(file);
  if (!fileId) return;

  if (selectedEditFileIds.value.includes(fileId)) {
    selectedEditFileIds.value = selectedEditFileIds.value.filter(
      (id) => id !== fileId,
    );
    return;
  }
  selectedEditFileIds.value = [...selectedEditFileIds.value, fileId];
}

function toggleEditSectionSelection(sectionId) {
  const numericId = Number(sectionId);
  const value = Number.isFinite(numericId) ? numericId : sectionId;
  const currentIds = Array.isArray(editForm.value.sectionIds)
    ? editForm.value.sectionIds
    : [];

  if (currentIds.some((id) => String(id) === String(value))) {
    editForm.value.sectionIds = currentIds.filter(
      (id) => String(id) !== String(value),
    );
    return;
  }

  editForm.value.sectionIds = [...currentIds, value];
}

function handleEditTopicChange(topic) {
  if (editForm.value.topic === topic) return;

  editForm.value.topic = topic;
  editForm.value.sectionIds = [];
}

function hasSectionValidationError(error) {
  const errors = error?.errors || error?.payload?.errors || {};
  return Object.keys(errors).some((field) =>
    String(field).toLowerCase().includes("section"),
  );
}

async function openConference(conference) {
  selectedConference.value = conference;
  selectedSpeaker.value = null;
  isEditing.value = false;
  editForm.value = createEmptyEditForm(conference);
  selectedEditFileIds.value = Array.isArray(conference?.usedFiles)
    ? conference.usedFiles.map(getFileSelectionId).filter(Boolean)
    : [];

  try {
    const loadedConference = await conferenceStore.loadConference(conference.id);
    if (loadedConference && selectedConference.value?.id === conference.id) {
      selectedConference.value = loadedConference;
      editForm.value = createEmptyEditForm(loadedConference);
      selectedEditFileIds.value = Array.isArray(loadedConference?.usedFiles)
        ? loadedConference.usedFiles.map(getFileSelectionId).filter(Boolean)
        : [];
    }
  } catch (error) {
    if (![401, 403, 404].includes(Number(error?.status || 0))) {
      showToast(getApiErrorMessage(error, "Не удалось загрузить конференцию"));
    }
  }
}

function closeModal() {
  selectedConference.value = null;
  selectedSpeaker.value = null;
  isEditing.value = false;
}

function startEditing() {
  if (
    !selectedConference.value ||
    !canManageConference(selectedConference.value)
  ) {
    showToast("Вы не можете редактировать чужую конференцию");
    return;
  }
  editForm.value = createEmptyEditForm(selectedConference.value);
  selectedEditFileIds.value = Array.isArray(
    selectedConference.value.usedFiles,
  )
    ? selectedConference.value.usedFiles.map(getFileSelectionId).filter(Boolean)
    : [];
  isEditing.value = true;
  selectedSpeaker.value = null;
}

function cancelEditing() {
  if (selectedConference.value) {
    editForm.value = createEmptyEditForm(selectedConference.value);
    selectedEditFileIds.value = Array.isArray(
      selectedConference.value.usedFiles,
    )
      ? selectedConference.value.usedFiles.map(getFileSelectionId).filter(Boolean)
      : [];
  }
  isEditing.value = false;
}

async function saveConferenceChanges() {
  if (!selectedConference.value) return;

  const currentEditForm = editForm.value;
  if (
    !currentEditForm.name.trim() ||
    !currentEditForm.description.trim() ||
    !currentEditForm.date ||
    !currentEditForm.time ||
    !currentEditForm.sectionIds?.length
  ) {
    showToast("Заполните все обязательные поля");
    return;
  }

  const updatedConference = {
    ...selectedConference.value,
    ...currentEditForm,
    usedFiles: availableFiles.value
      .filter((file) => selectedEditFileIds.value.includes(getFileSelectionId(file)))
      .map((file) => ({
        id: file.id,
        name: file.name,
        size: file.size,
        type: file.type,
        date: file.date,
        contentId: file.contentId,
        fileId: file.id || file.contentId || file.file_id,
        sourceUserEmail:
          file.sourceUserEmail ||
          (typeof auth.user === "string" ? auth.user : auth.user?.email || ""),
      })),
  };

  const missingContentFile = updatedConference.usedFiles.find(
    (file) => !file.contentId && !file.content,
  );
  if (missingContentFile) {
    showToast(
      `Файл «${missingContentFile.name}» был загружен раньше и не содержит данных для скачивания. Перезагрузите его в разделе «Материалы».`,
    );
    return;
  }

  try {
    await conferenceStore.updateConference(
      selectedConference.value.id,
      updatedConference,
    );
    selectedConference.value = conferenceStore.getConferenceById(
      selectedConference.value.id,
    );
    selectedConference.value = selectedConference.value || updatedConference;
    isEditing.value = false;
    showToast("Конференция обновлена");
  } catch (error) {
    if (
      Number(error?.status || 0) === 422 &&
      hasSectionValidationError(error)
    ) {
      showToast("Выбранная секция не относится к выбранной теме");
      return;
    }

    showToast(getApiErrorMessage(error, "Не удалось обновить конференцию"));
    console.error("saveConferenceChanges error:", error);
  }
}

async function downloadConferenceFile(file) {
  if (await downloadStoredFile(file)) {
    return;
  }

  const fileId = getFileSelectionId(file);
  const fallbackFile =
    fileId && file?.sourceUserEmail
      ? getFileById(file.sourceUserEmail, fileId)
      : fileId
        ? getAnyFileById(fileId)
        : null;
  if (await downloadStoredFile(fallbackFile)) {
    return;
  }

  showToast("Файл недоступен для скачивания");
}
</script>

<template>
  <div class="conferences-container">
    <div class="conferences-wrapper">
      <div class="header-section">
        <h1 class="page-title">Все конференции</h1>
        <p class="page-lead">Список всех созданных конференций</p>
      </div>

      <div class="card filter-card">
        <div class="filter-field">
          <label class="filter-label">Фильтр по теме</label>
          <SelectDropdown v-model="filterTopic" :options="filterOptions" />
        </div>
        <div class="filter-field">
          <label class="filter-label">Фильтр по секции</label>
          <SelectDropdown
            v-model="filterSectionId"
            :options="sectionFilterOptions"
            label="Все секции"
          />
        </div>
      </div>

      <div v-if="filteredConferences.length > 0" class="conferences-grid">
        <div
          v-for="conf in filteredConferences"
          :key="conf.id"
          class="conference-card"
          @click="openConference(conf)"
        >
          <div class="conference-header">
            <h3 class="conference-name">{{ conf?.name || "Без названия" }}</h3>
            <div class="conference-badges">
              <span
                class="conference-status"
                :class="`conference-status--${getConferenceStatus(conf).variant}`"
              >
                {{ getConferenceStatus(conf).label }}
              </span>
              <span class="conference-topic">{{
                topics[conf?.topic] || "Тема"
              }}</span>
            </div>
          </div>

          <p class="conference-description">
            {{ conf?.description || "Описание отсутствует" }}
          </p>

          <div class="conference-meta">
            <span class="meta-item">📅 {{ conf?.date || "—" }}</span>
            <span class="meta-item">🕐 {{ conf?.time || "—" }}</span>
          </div>

          <div
            v-if="getConferenceStatus(conf).variant === 'new'"
            class="conference-countdown"
          >
            {{ getConferenceCountdown(conf) }}
          </div>

          <div class="participant-counts" aria-label="Количество участников">
            <div class="participant-count-card">
              <span class="participant-count-number">
                {{ getConferenceSpeakersCount(conf) }}
              </span>
              <span class="participant-count-label">докладчиков</span>
            </div>
            <div class="participant-count-card">
              <span class="participant-count-number">
                {{ getConferenceReviewersCount(conf) }}
              </span>
              <span class="participant-count-label">рецензентов</span>
            </div>
          </div>

          <div
            v-if="getConferenceSections(conf).length > 0"
            class="conference-sections-summary"
          >
            <span
              v-for="section in getConferenceSections(conf)"
              :key="section.id || section.name"
              class="conference-section-chip"
            >
              {{ section.name }}
              <strong>{{ getSectionSpeakerCount(section) }}</strong>
            </span>
          </div>

          <div
            v-if="
              getApplicationStatusText(conf, 'speaker') ||
              getApplicationStatusText(conf, 'reviewer')
            "
            class="application-status-list"
          >
            <span
              v-if="getApplicationStatusText(conf, 'speaker')"
              class="application-status-chip"
              :class="`application-status-chip--${getApplicationStatus(conf, 'speaker')}`"
            >
              {{ getApplicationStatusText(conf, "speaker") }}
            </span>
            <span
              v-if="getApplicationStatusText(conf, 'reviewer')"
              class="application-status-chip"
              :class="`application-status-chip--${getApplicationStatus(conf, 'reviewer')}`"
            >
              {{ getApplicationStatusText(conf, "reviewer") }}
            </span>
          </div>

          <div class="conference-actions">
            <template v-if="isConferenceInFuture(conf)">
              <button
                v-if="canApplyForApplication(conf, 'speaker')"
                class="conference-book-button"
                @click.stop="openApplicationForm(conf, 'speaker')"
              >
                Подать заявку как докладчик
              </button>
              <button
                v-if="canApplyForApplication(conf, 'reviewer')"
                class="conference-book-button conference-book-button--reviewer"
                @click.stop="openApplicationForm(conf, 'reviewer')"
              >
                Подать заявку как рецензент
              </button>
              <p v-else-if="!auth.isAuthenticated" class="conference-book-hint">
                Войдите, чтобы подать заявку
              </p>
              <p
                v-else-if="
                  isApplicationActive(conf, 'speaker') ||
                  isApplicationActive(conf, 'reviewer')
                "
                class="conference-book-hint"
              >
                Активная заявка уже есть
              </p>
            </template>
            <div v-else class="conference-book-spacer"></div>
          </div>

          <div class="conference-footer-meta">
            <span class="conference-meta-chip">
              Автор: {{ getConferenceCreatorLabel(conf) }}
            </span>
            <span class="conference-meta-chip">
              Файлы: {{ getConferenceFilesCount(conf) }}
            </span>
          </div>
        </div>
      </div>

      <div v-else class="empty-state">
        <div class="empty-icon">📭</div>
        <p class="empty-title">Нет конференций</p>
        <p class="empty-text">
          {{
            filterTopic === "all"
              ? "Конференции еще не созданы"
              : "Конференций этой темы не найдено"
          }}
        </p>
      </div>
    </div>
  </div>

  <div v-if="selectedConference" class="modal-overlay" @click="closeModal">
    <div class="modal-content" @click.stop>
      <button class="modal-close" @click="closeModal">✕</button>

      <div v-if="!isEditing">
        <div class="modal-header">
          <h2 class="modal-title">{{ selectedConference.name }}</h2>
          <span class="modal-topic">{{
            topics[selectedConference.topic]
          }}</span>
        </div>

        <div class="modal-section">
          <h3 class="modal-subtitle">О конференции</h3>
          <p class="modal-text">{{ selectedConference.description }}</p>
        </div>

        <div class="modal-section">
          <h3 class="modal-subtitle">Используемые файлы</h3>
          <div
            v-if="
              selectedConference.usedFiles &&
              selectedConference.usedFiles.length > 0
            "
            class="files-list"
          >
            <div
              v-for="(file, index) in selectedConference.usedFiles"
              :key="getFileKey(file, index)"
              class="file-chip"
            >
              <button
                type="button"
                class="file-chip-button"
                @click="downloadConferenceFile(file)"
              >
                <span class="file-chip-name">{{ file.name }}</span>
                <span v-if="file.size" class="file-chip-meta">{{
                  formatFileSize(file.size)
                }}</span>
              </button>
            </div>
          </div>
          <p v-else class="modal-text">
            Файлы для этой конференции не добавлены.
          </p>
        </div>

        <div class="modal-section">
          <h3 class="modal-subtitle">Дата и время</h3>
          <p class="modal-text">
            {{ selectedConference.date }} в {{ selectedConference.time }}
          </p>
        </div>

        <div class="modal-section modal-section--meta-grid">
          <div class="modal-meta-item">
            <h3 class="modal-subtitle">Автор конференции</h3>
            <p class="modal-text">
              {{ getConferenceCreatorLabel(selectedConference) }}
            </p>
          </div>
          <div class="modal-meta-item">
            <h3 class="modal-subtitle">Количество файлов</h3>
            <p class="modal-text">
              {{ getConferenceFilesCount(selectedConference) }}
            </p>
          </div>
          <div class="modal-meta-item">
            <h3 class="modal-subtitle">Участники</h3>
            <p class="modal-text">
              {{ getConferenceParticipantsSummary(selectedConference) }}
            </p>
          </div>
        </div>

        <div
          v-if="
            auth.isAdmin && getConferenceBookings(selectedConference).length > 0
          "
          class="modal-section"
        >
          <h3 class="modal-subtitle">Бронирования</h3>
          <div class="booking-list">
            <div
              v-for="booking in getConferenceBookings(selectedConference)"
              :key="booking.id || booking.email"
              class="booking-item"
            >
              <div>
                <p class="booking-name">{{ booking.name || "Участник" }}</p>
                <p class="booking-email">
                  {{ booking.email || "Email не указан" }}
                </p>
              </div>
              <span class="booking-date">
                {{ formatBookingDate(booking.bookedAt || booking.booked_at) }}
              </span>
            </div>
          </div>
        </div>

        <div class="modal-section">
          <h3 class="modal-subtitle">Участие</h3>
          <div
            v-if="
              getApplicationStatusText(selectedConference, 'speaker') ||
              getApplicationStatusText(selectedConference, 'reviewer')
            "
            class="application-status-list application-status-list--modal"
          >
            <span
              v-if="getApplicationStatusText(selectedConference, 'speaker')"
              class="application-status-chip"
              :class="`application-status-chip--${getApplicationStatus(selectedConference, 'speaker')}`"
            >
              {{ getApplicationStatusText(selectedConference, "speaker") }}
            </span>
            <span
              v-if="getApplicationStatusText(selectedConference, 'reviewer')"
              class="application-status-chip"
              :class="`application-status-chip--${getApplicationStatus(selectedConference, 'reviewer')}`"
            >
              {{ getApplicationStatusText(selectedConference, "reviewer") }}
            </span>
          </div>
          <p
            class="modal-text"
            v-if="
              isConferenceInFuture(selectedConference) &&
              canParticipate(selectedConference)
            "
          >
            Выберите тип заявки: докладчик или рецензент.
          </p>
          <p
            class="modal-text"
            v-else-if="isConferenceInFuture(selectedConference)"
          >
            Войдите, чтобы выбрать формат участия.
          </p>
          <p v-else class="modal-text">
            Участие в завершенных конференциях недоступно.
          </p>
        </div>

        <div class="modal-section">
          <h3 class="modal-subtitle">Участники</h3>
          <div
            v-if="getConferencePeople(selectedConference).length > 0"
            class="speakers-list"
          >
            <div
              v-for="(person, personIndex) in getConferencePeople(selectedConference)"
              :key="`${getSpeakerKey(person) || 'person'}-${personIndex}`"
              class="speaker-list-item"
            >
              <button
                type="button"
                class="speaker-full-info"
                :class="{
                  'speaker-full-info--active': isSpeakerSelected(person),
                }"
                @click="selectSpeaker(person)"
              >
                <div class="speaker-avatar-large">
                  <img
                    v-if="person.photo"
                    :src="person.photo"
                    :alt="getSpeakerDisplayNameFromSpeaker(person)"
                    class="speaker-avatar-image speaker-avatar-image--large"
                  />
                  <template v-else>{{ getSpeakerInitials(person) }}</template>
                </div>
                <div class="speaker-full-details">
                  <p class="speaker-full-name">
                    {{ getSpeakerDisplayNameFromSpeaker(person) }}
                  </p>
                  <p
                    v-if="getPersonPreview(person)"
                    class="speaker-full-bio"
                  >
                    {{ getPersonPreview(person) }}
                  </p>
                </div>
                <span class="speaker-open-indicator" aria-hidden="true">›</span>
              </button>
            </div>
          </div>
          <p v-else class="modal-text">Участники пока не добавлены.</p>
        </div>

        <div
          v-if="selectedSpeaker"
          class="person-modal-overlay"
          @click="clearSelectedSpeaker"
        >
          <article class="speaker-public-card person-modal-card" @click.stop>
            <div class="speaker-public-header">
              <div>
                <h4 class="speaker-public-title">
                  {{ getSpeakerDisplayNameFromSpeaker(selectedSpeaker) }}
                </h4>
                <p class="speaker-public-subtitle">
                  {{ selectedPersonSubtitle }}
                </p>
              </div>
              <button
                type="button"
                class="speaker-public-close"
                aria-label="Закрыть информацию об участнике"
                @click="clearSelectedSpeaker"
              >
                ✕
              </button>
            </div>

            <dl class="speaker-public-grid">
              <div
                v-for="row in selectedSpeakerDetailRows"
                :key="row.label"
                class="speaker-public-field"
              >
                <dt>{{ row.label }}</dt>
                <dd>{{ row.value }}</dd>
              </div>
              <div
                v-if="auth.isAdmin"
                class="speaker-public-field speaker-public-field--full"
              >
                <dt>Файл</dt>
                <dd>
                  <template v-if="selectedSpeakerReportFile">
                    <button
                      v-if="canDownloadSpeakerFile(selectedSpeakerReportFile)"
                      type="button"
                      class="speaker-file-button"
                      @click="downloadSpeakerReportFile(selectedSpeakerReportFile)"
                    >
                      {{ getSpeakerFileName(selectedSpeakerReportFile) }}
                    </button>
                    <span v-else>
                      {{ getSpeakerFileName(selectedSpeakerReportFile) }}
                    </span>
                  </template>
                  <span v-else>{{ PUBLIC_EMPTY_VALUE }}</span>
                </dd>
              </div>
            </dl>
          </article>
        </div>
      </div>

      <div v-else class="edit-form">
        <div class="edit-section-title">
          <h3 class="modal-subtitle">Редактирование конференции</h3>
          <span class="edit-hint"
            >Вы можете менять данные и привязанные материалы</span
          >
        </div>

        <div class="edit-grid">
          <div class="edit-field edit-field--full">
            <label class="edit-label">Название конференции</label>
            <input v-model="editForm.name" class="edit-input" type="text" />
          </div>

          <div class="edit-field edit-field--full">
            <label class="edit-label">Тема конференции</label>
            <SelectDropdown
              :model-value="editForm.topic"
              :options="filterOptions.slice(1)"
              @update:model-value="handleEditTopicChange"
            />
          </div>

          <div class="edit-field edit-field--full">
            <label class="edit-label">Описание</label>
            <textarea
              v-model="editForm.description"
              class="edit-textarea"
              rows="4"
            ></textarea>
          </div>

          <div class="edit-field edit-field--full">
            <label class="edit-label">Секции конференции</label>
            <p class="edit-help">
              Выберите одну или несколько секций для заявок на конференцию.
            </p>
            <div
              v-if="getEditableSections(selectedConference).length > 0"
              class="edit-sections-list"
            >
              <label
                v-for="section in getEditableSections(selectedConference)"
                :key="section.id"
                class="edit-section-item"
              >
                <input
                  type="checkbox"
                  :value="section.id"
                  :checked="
                    editForm.sectionIds.some(
                      (sectionId) => String(sectionId) === String(section.id),
                    )
                  "
                  @change="toggleEditSectionSelection(section.id)"
                />
                <span class="edit-section-name">{{ section.name }}</span>
              </label>
            </div>
            <p v-else class="edit-help edit-help--error">
              {{ sectionsError || "Секции пока не настроены." }}
            </p>
          </div>

          <div class="edit-field edit-field--full">
            <label class="edit-label">Материалы конференции</label>
            <p class="edit-help">Выберите файлы из загруженных материалов</p>
            <div v-if="availableFiles.length > 0" class="edit-files-list">
              <label
                v-for="(file, index) in availableFiles"
                :key="getFileKey(file, index)"
                class="edit-file-item"
              >
                <input
                  type="checkbox"
                  :value="getFileSelectionId(file)"
                  :checked="selectedEditFileIds.includes(getFileSelectionId(file))"
                  @change="toggleEditFileSelection(file)"
                />
                <span class="edit-file-name">{{ file.name }}</span>
                <span class="edit-file-meta">{{
                  formatFileSize(file.size)
                }}</span>
              </label>
            </div>
            <p v-else class="edit-help">
              Сначала загрузите материалы на странице «Материалы».
            </p>
          </div>

          <div class="edit-field">
            <label class="edit-label">Дата начала</label>
            <input v-model="editForm.date" class="edit-input" type="date" />
          </div>

          <div class="edit-field">
            <label class="edit-label">Время начала</label>
            <input v-model="editForm.time" class="edit-input" type="time" />
          </div>
        </div>
      </div>

      <div class="modal-actions">
        <button
          v-if="
            !isEditing && canApplyForApplication(selectedConference, 'speaker')
          "
          type="button"
          class="btn-book"
          @click.stop="openApplicationForm(selectedConference, 'speaker')"
        >
          Подать заявку как докладчик
        </button>
        <button
          v-if="
            !isEditing && canApplyForApplication(selectedConference, 'reviewer')
          "
          type="button"
          class="btn-speaker-request btn-reviewer-request"
          @click.stop="openApplicationForm(selectedConference, 'reviewer')"
        >
          Подать заявку как рецензент
        </button>
        <button v-if="isEditing" @click="cancelEditing" class="btn-close">
          Отмена
        </button>
        <button
          v-if="isEditing"
          @click="saveConferenceChanges"
          class="btn-save"
        >
          Сохранить
        </button>
        <template v-else>
          <button
            v-if="canManageConference(selectedConference)"
            @click="startEditing"
            class="btn-edit"
          >
            Редактировать
          </button>
          <button
            v-if="canDeleteConference(selectedConference)"
            @click="deleteConference(selectedConference.id)"
            class="btn-delete"
          >
            Удалить
          </button>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.conferences-container {
  min-height: calc(100vh - 140px);
  background-color: var(--background-color);
  padding: 40px 15px;
}

.conferences-wrapper {
  max-width: 1000px;
  margin: 0 auto;
}

.header-section {
  margin-bottom: 40px;
  text-align: center;
}

.title {
  font-family: "Poppins", sans-serif;
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--text-color);
  margin: 0 0 10px 0;
}

.subtitle {
  font-family: "Roboto", sans-serif;
  color: var(--light-text-color);
  margin: 0;
  font-size: 1rem;
}

.card {
  background-color: var(--card-background-color);
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid var(--border-color);
}

.filter-card {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 30px;
}

.filter-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-label {
  font-family: "Roboto", sans-serif;
  font-weight: 600;
  color: var(--text-color);
  white-space: nowrap;
}

.filter-card :deep(.custom-select-container) {
  flex: 1;
}

.conferences-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
  margin-bottom: 40px;
}

.conference-card {
  background-color: var(--card-background-color);
  border-radius: 16px;
  padding: 20px;
  border: 1px solid var(--border-color);
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

:global(html[data-theme="dark"]) .conference-card:hover {
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.34);
  border-color: rgba(74, 105, 226, 0.5);
}

.conference-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);
  border-color: var(--primary-color);
}

.conference-header {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 10px;
}

.conference-badges {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.conference-name {
  font-family: "Poppins", sans-serif;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-color);
  margin: 0;
  line-height: 1.3;
}

.conference-topic {
  background-color: rgba(74, 105, 226, 0.15);
  color: var(--primary-color);
  padding: 4px 10px;
  border-radius: 8px;
  font-family: "Roboto", sans-serif;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}

.conference-status {
  padding: 4px 10px;
  border-radius: 999px;
  font-family: "Roboto", sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  white-space: nowrap;
}

.conference-status--new {
  background-color: rgba(34, 197, 94, 0.14);
  color: #15803d;
}

.conference-status--finished {
  background-color: rgba(148, 163, 184, 0.18);
  color: #64748b;
}

.conference-description {
  font-family: "Roboto", sans-serif;
  font-size: 0.9rem;
  color: var(--light-text-color);
  margin: 0 0 10px 0;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.conference-meta {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-color);
}

.participant-counts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin: 16px 0 8px;
}

.participant-count-card {
  display: flex;
  flex-direction: column;
  gap: 3px;
  border: 1px solid rgba(74, 105, 226, 0.14);
  border-radius: 10px;
  background: rgba(74, 105, 226, 0.06);
  padding: 10px 12px;
}

.participant-count-number {
  color: var(--text-color);
  font-family: "Poppins", sans-serif;
  font-size: 1.35rem;
  font-weight: 600;
  line-height: 1;
}

.participant-count-label {
  color: var(--light-text-color);
  font-family: "Roboto", sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
}

.conference-sections-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 10px 0 14px;
}

.conference-section-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.12);
  color: var(--text-color);
  padding: 5px 9px;
  font-family: "Roboto", sans-serif;
  font-size: 0.76rem;
  font-weight: 700;
}

.conference-section-chip strong {
  color: var(--primary-color);
}

.conference-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 10px 0 16px;
  flex-wrap: wrap;
}

.conference-footer-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.conference-meta-chip {
  display: inline-flex;
  align-items: center;
  padding: 5px 9px;
  border-radius: 999px;
  background: rgba(74, 105, 226, 0.08);
  color: var(--text-color);
  font-family: "Roboto", sans-serif;
  font-size: 0.72rem;
  font-weight: 600;
}

.application-status-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 12px 0;
}

.application-status-list--modal {
  margin-top: 0;
}

.application-status-chip {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 6px 10px;
  background: rgba(148, 163, 184, 0.16);
  color: var(--text-color);
  font-family: "Roboto", sans-serif;
  font-size: 0.76rem;
  font-weight: 700;
}

.application-status-chip--pending {
  background: rgba(245, 158, 11, 0.16);
  color: #b45309;
}

.application-status-chip--approved {
  background: rgba(34, 197, 94, 0.14);
  color: #15803d;
}

.application-status-chip--rejected {
  background: rgba(239, 68, 68, 0.14);
  color: #dc2626;
}

.conference-book-button,
.btn-book {
  border: none;
  border-radius: 999px;
  padding: 10px 14px;
  background: linear-gradient(135deg, var(--primary-color), #6c8cff);
  color: #fff;
  font-family: "Roboto", sans-serif;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    opacity 0.2s ease;
}

.conference-book-button:hover,
.btn-book:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(74, 105, 226, 0.22);
}

.conference-book-button--booked {
  background: rgba(148, 163, 184, 0.18);
  color: var(--text-color);
  box-shadow: none;
}

.conference-book-button--reviewer,
.btn-reviewer-request {
  background: linear-gradient(135deg, #16a34a, #22c55e);
}

.conference-book-button:disabled,
.btn-speaker-request:disabled,
.btn-reviewer-request:disabled {
  cursor: not-allowed;
  opacity: 0.68;
  transform: none;
  box-shadow: none;
}

.conference-book-hint,
.conference-book-count {
  font-family: "Roboto", sans-serif;
  font-size: 0.78rem;
  color: var(--light-text-color);
  margin: 0;
}

.conference-book-spacer {
  height: 18px;
}

.conference-countdown {
  margin-bottom: 16px;
  padding: 10px 12px;
  border-radius: 12px;
  background: linear-gradient(
    135deg,
    rgba(74, 105, 226, 0.08),
    rgba(255, 165, 0, 0.08)
  );
  border: 1px solid rgba(74, 105, 226, 0.12);
  color: var(--text-color);
  font-family: "Roboto", sans-serif;
  font-size: 0.82rem;
  font-weight: 600;
}

.conference-countdown--finished {
  background: rgba(148, 163, 184, 0.14);
  border-color: rgba(148, 163, 184, 0.18);
  color: var(--light-text-color);
}

.meta-item {
  font-family: "Roboto", sans-serif;
  font-size: 0.8rem;
  color: var(--light-text-color);
}

.speaker-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.speaker-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: linear-gradient(
    135deg,
    var(--primary-color) 0%,
    var(--secondary-color) 100%
  );
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: "Poppins", sans-serif;
  font-weight: 700;
  flex-shrink: 0;
  overflow: hidden;
}

.speaker-avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.speaker-details {
  flex: 1;
  min-width: 0;
}

.speaker-name {
  font-family: "Roboto", sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-color);
  margin: 0;
}

.speaker-email {
  font-family: "Roboto", sans-serif;
  font-size: 0.75rem;
  color: var(--light-text-color);
  margin: 4px 0 0 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty-state {
  text-align: center;
  padding: 80px 20px;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 20px;
}

.empty-title {
  font-family: "Poppins", sans-serif;
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--text-color);
  margin: 0 0 8px 0;
}

.empty-text {
  font-family: "Roboto", sans-serif;
  color: var(--light-text-color);
  margin: 0;
}

/* Модальное окно */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

:global(html[data-theme="dark"]) .modal-overlay {
  background-color: rgba(0, 0, 0, 0.72);
}

.modal-content {
  background-color: var(--card-background-color);
  border-radius: 16px;
  padding: 40px;
  max-width: 600px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  border: 1px solid var(--border-color);
  position: relative;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-close {
  position: absolute;
  top: 16px;
  right: 16px;
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--light-text-color);
  transition: color 0.3s ease;
}

.modal-close:hover {
  color: var(--text-color);
}

.modal-header {
  margin-bottom: 24px;
}

.modal-title {
  font-family: "Poppins", sans-serif;
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--text-color);
  margin: 0 0 12px 0;
}

.modal-topic {
  display: inline-block;
  background-color: rgba(74, 105, 226, 0.15);
  color: var(--primary-color);
  padding: 6px 12px;
  border-radius: 8px;
  font-family: "Roboto", sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
}

.modal-section {
  margin-bottom: 24px;
}

.modal-section--meta-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.modal-meta-item {
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(74, 105, 226, 0.06);
  border: 1px solid rgba(74, 105, 226, 0.12);
}

.files-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.file-chip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(74, 105, 226, 0.08);
  border: 1px solid rgba(74, 105, 226, 0.12);
}

.file-chip-button {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
}

.file-chip-button:hover .file-chip-name {
  color: var(--primary-color);
}

.file-chip-name {
  font-family: "Roboto", sans-serif;
  color: var(--text-color);
  font-weight: 600;
  word-break: break-word;
}

.file-chip-meta {
  font-family: "Roboto", sans-serif;
  color: var(--light-text-color);
  font-size: 0.85rem;
  white-space: nowrap;
}

.modal-subtitle {
  font-family: "Poppins", sans-serif;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-color);
  margin: 0 0 12px 0;
}

.modal-text {
  font-family: "Roboto", sans-serif;
  color: var(--light-text-color);
  margin: 0;
  line-height: 1.6;
}

.booking-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.booking-item {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(74, 105, 226, 0.06);
  border: 1px solid rgba(74, 105, 226, 0.12);
}

.booking-name,
.booking-email {
  margin: 0;
  font-family: "Roboto", sans-serif;
}

.booking-name {
  color: var(--text-color);
  font-weight: 700;
}

.booking-email,
.booking-date {
  color: var(--light-text-color);
  font-size: 0.86rem;
  word-break: break-word;
}

.booking-date {
  flex-shrink: 0;
  font-family: "Roboto", sans-serif;
}

.speaker-full-info {
  width: 100%;
  display: flex;
  gap: 16px;
  align-items: flex-start;
  border: 1px solid rgba(74, 105, 226, 0.12);
  border-radius: 12px;
  background: rgba(74, 105, 226, 0.04);
  padding: 12px;
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease,
    transform 0.2s ease;
}

.speaker-full-info:hover {
  border-color: rgba(74, 105, 226, 0.32);
  background: rgba(74, 105, 226, 0.08);
  transform: translateY(-1px);
}

.speaker-full-info--active {
  border-color: var(--primary-color);
  background: rgba(74, 105, 226, 0.1);
}

.speakers-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.conference-section-groups {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.conference-section-group {
  padding: 14px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 12px;
  background: rgba(74, 105, 226, 0.035);
}

.conference-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.conference-section-head h4 {
  margin: 0;
  color: var(--text-color);
  font-family: "Poppins", sans-serif;
  font-size: 1rem;
}

.conference-section-head span {
  flex-shrink: 0;
  border-radius: 999px;
  background: rgba(74, 105, 226, 0.1);
  color: var(--primary-color);
  padding: 4px 8px;
  font-family: "Roboto", sans-serif;
  font-size: 0.78rem;
  font-weight: 800;
}

.speaker-list-item {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.speaker-avatar-large {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(
    135deg,
    var(--primary-color) 0%,
    var(--secondary-color) 100%
  );
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: "Poppins", sans-serif;
  font-size: 1.8rem;
  font-weight: 700;
  flex-shrink: 0;
  overflow: hidden;
}

.speaker-avatar-image--large {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.speaker-full-details {
  flex: 1;
  min-width: 0;
}

.speaker-full-name {
  font-family: "Poppins", sans-serif;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-color);
  margin: 0 0 4px 0;
}

.speaker-full-bio {
  font-family: "Roboto", sans-serif;
  font-size: 0.9rem;
  color: var(--light-text-color);
  margin: 0;
  line-height: 1.5;
}

.speaker-open-indicator {
  margin-left: auto;
  color: var(--primary-color);
  font-family: "Poppins", sans-serif;
  font-size: 1.45rem;
  line-height: 1;
  opacity: 0.72;
}

.speaker-public-card {
  padding: 18px;
  border-radius: 14px;
  border: 1px solid rgba(74, 105, 226, 0.16);
  background: rgba(74, 105, 226, 0.05);
}

.person-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(15, 23, 42, 0.56);
}

:global(html[data-theme="dark"]) .person-modal-overlay {
  background: rgba(0, 0, 0, 0.74);
}

.person-modal-card {
  width: min(720px, 100%);
  max-height: 86vh;
  overflow-y: auto;
  background: var(--card-background-color);
  box-shadow: 0 22px 58px rgba(0, 0, 0, 0.28);
}

.speaker-public-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 16px;
}

.speaker-public-title {
  margin: 0 0 4px;
  color: var(--text-color);
  font-family: "Poppins", sans-serif;
  font-size: 1.05rem;
  font-weight: 700;
}

.speaker-public-subtitle {
  margin: 0;
  color: var(--light-text-color);
  font-family: "Roboto", sans-serif;
  font-size: 0.88rem;
}

.speaker-public-close {
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.14);
  color: var(--light-text-color);
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    color 0.2s ease;
}

.speaker-public-close:hover {
  background: rgba(239, 68, 68, 0.14);
  color: #dc2626;
}

.speaker-public-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin: 0;
}

.speaker-public-field {
  min-width: 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--card-background-color);
  border: 1px solid rgba(148, 163, 184, 0.16);
}

.speaker-public-field--full {
  grid-column: 1 / -1;
}

.speaker-public-field dt {
  margin: 0 0 6px;
  color: var(--light-text-color);
  font-family: "Roboto", sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.speaker-public-field dd {
  margin: 0;
  color: var(--text-color);
  font-family: "Roboto", sans-serif;
  font-size: 0.94rem;
  line-height: 1.45;
  word-break: break-word;
}

.speaker-file-button {
  padding: 0;
  border: none;
  background: transparent;
  color: var(--primary-color);
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  text-align: left;
}

.speaker-file-button:hover {
  text-decoration: underline;
}

.modal-actions {
  display: flex;
  gap: 12px;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid var(--border-color);
  flex-wrap: wrap;
}

.btn-close,
.btn-delete,
.btn-edit,
.btn-save,
.btn-speaker-request {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 10px;
  font-family: "Poppins", sans-serif;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-close {
  background-color: var(--border-color);
  color: var(--text-color);
}

.btn-close:hover {
  opacity: 0.8;
}

.btn-delete {
  background-color: #ef4444;
  color: white;
}

.btn-delete:hover {
  background-color: #dc2626;
}

.btn-edit,
.btn-save,
.btn-speaker-request {
  background-color: var(--primary-color);
  color: white;
}

.btn-edit:hover,
.btn-save:hover,
.btn-speaker-request:hover {
  background-color: var(--secondary-color);
}

.edit-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.edit-section-title {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.edit-hint {
  font-family: "Roboto", sans-serif;
  color: var(--light-text-color);
  font-size: 0.85rem;
}

.edit-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.edit-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.edit-field--full {
  grid-column: 1 / -1;
}

.edit-label {
  font-family: "Roboto", sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-color);
}

.edit-input,
.edit-textarea {
  font-family: "Roboto", sans-serif;
  font-size: 0.95rem;
  padding: 12px 14px;
  border: 2px solid var(--border-color);
  border-radius: 10px;
  background-color: var(--card-background-color);
  color: var(--text-color);
  transition: all 0.3s ease;
  box-sizing: border-box;
}

.edit-input:focus,
.edit-textarea:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(74, 105, 226, 0.1);
}

.edit-textarea {
  resize: vertical;
  min-height: 100px;
}

.edit-help {
  font-family: "Roboto", sans-serif;
  font-size: 0.85rem;
  color: var(--light-text-color);
  margin: 0;
}

.edit-help--error {
  color: #dc2626;
}

.edit-sections-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.edit-section-item {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 10px;
  align-items: center;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  background: rgba(74, 105, 226, 0.05);
}

.edit-section-item input {
  margin: 0;
}

.edit-section-name {
  color: var(--text-color);
  font-family: "Roboto", sans-serif;
  font-size: 0.92rem;
  word-break: break-word;
}

.edit-files-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.edit-file-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 10px;
  align-items: center;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  background: rgba(74, 105, 226, 0.05);
}

.edit-file-name {
  font-family: "Roboto", sans-serif;
  font-size: 0.92rem;
  color: var(--text-color);
  word-break: break-word;
}

.edit-file-meta {
  font-family: "Roboto", sans-serif;
  font-size: 0.8rem;
  color: var(--light-text-color);
  white-space: nowrap;
}

@media (max-width: 640px) {
  .edit-grid {
    grid-template-columns: 1fr;
  }

  .filter-card,
  .edit-sections-list {
    grid-template-columns: 1fr;
  }

  .modal-actions {
    flex-direction: column;
  }

  .modal-section--meta-grid {
    grid-template-columns: 1fr;
  }

  .speaker-full-info {
    align-items: center;
  }

  .speaker-avatar-large {
    width: 58px;
    height: 58px;
    font-size: 1.25rem;
  }

  .speaker-public-grid {
    grid-template-columns: 1fr;
  }
}
</style>
