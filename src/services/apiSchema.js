function pickValue(source, camelKey, snakeKey, fallback = null) {
  if (!source || typeof source !== "object") return fallback;

  if (source[camelKey] !== undefined && source[camelKey] !== null) {
    return source[camelKey];
  }

  if (source[snakeKey] !== undefined && source[snakeKey] !== null) {
    return source[snakeKey];
  }

  return fallback;
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeBoolean(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    return ["true", "1", "yes"].includes(value.trim().toLowerCase());
  }

  return Boolean(value);
}

function normalizeProfileApplicationRecord(application) {
  if (!application || typeof application !== "object") return application;

  return normalizeApplicationRecord({
    ...application,
    user: null,
    requestUser: null,
    account: null,
  });
}

function normalizeParticipationRoleRecord(
  role,
  fallbackStatus = "none",
  fallbackApplications = [],
  fallbackConferences = [],
) {
  const source = role && typeof role === "object" ? role : {};
  const applications = ensureArray(
    pickValue(source, "applications", "applications", fallbackApplications),
  )
    .map(normalizeProfileApplicationRecord)
    .filter((application) => application && typeof application === "object");
  const conferences = ensureArray(
    pickValue(source, "conferences", "conferences", fallbackConferences),
  )
    .map(normalizeConferenceRecord)
    .filter((conference) => conference && typeof conference === "object");

  return {
    ...source,
    status: pickValue(source, "status", "status", fallbackStatus),
    applications,
    conferences,
  };
}

export function normalizeConferenceSectionRecord(section) {
  if (!section || typeof section !== "object") return section;
  const speakers = ensureArray(pickValue(section, "speakers", "speakers", []))
    .map(normalizeConferenceSectionSpeakerRecord)
    .filter((speaker) => speaker && typeof speaker === "object");
  const speakerCount = pickValue(
    section,
    "speakerCount",
    "speaker_count",
    speakers.length,
  );

  return {
    ...section,
    id: pickValue(section, "id", "id"),
    name:
      pickValue(section, "name", "name") ||
      pickValue(section, "title", "title") ||
      pickValue(section, "label", "label") ||
      "",
    speakerCount:
      Number.isFinite(Number(speakerCount)) ? Number(speakerCount) : speakers.length,
    speakers,
  };
}

function normalizeConferenceSectionSpeakerRecord(speaker) {
  if (!speaker || typeof speaker !== "object") return speaker;

  const rawApplicationInfo =
    pickValue(speaker, "applicationInfo", "application_info", null) || {};
  const rawReport =
    pickValue(speaker, "report", "report", null) ||
    pickValue(rawApplicationInfo, "report", "report", null) ||
    null;
  const rawFile =
    pickValue(speaker, "file", "file", null) ||
    rawReport?.file ||
    pickValue(rawApplicationInfo, "file", "file", null) ||
    null;
  const file = rawFile ? normalizeFileRecord(rawFile) : null;
  const reportTitle =
    pickValue(speaker, "reportTitle", "report_title", "") ||
    pickValue(rawApplicationInfo, "reportTitle", "report_title", "") ||
    rawReport?.title ||
    "";
  const firstName = pickValue(speaker, "firstName", "first_name", "");
  const lastName = pickValue(speaker, "lastName", "last_name", "");
  const middleName = pickValue(speaker, "middleName", "middle_name", "");
  const name =
    pickValue(speaker, "name", "name", "") ||
    [lastName, firstName, middleName].filter(Boolean).join(" ").trim();
  const rawSection = pickValue(speaker, "section", "section", null);

  return {
    ...speaker,
    id: pickValue(speaker, "id", "id"),
    applicationId: pickValue(speaker, "applicationId", "application_id", null),
    participantId: pickValue(speaker, "participantId", "participant_id", null),
    firstName,
    lastName,
    middleName,
    name,
    sectionId: pickValue(speaker, "sectionId", "section_id", rawSection?.id || null),
    section: rawSection
      ? {
          ...rawSection,
          id: pickValue(rawSection, "id", "id"),
          name:
            pickValue(rawSection, "name", "name") ||
            pickValue(rawSection, "title", "title") ||
            "",
        }
      : null,
    reportTitle,
    file,
    report:
      rawReport || file || reportTitle
        ? {
            ...(rawReport || {}),
            title: rawReport?.title || reportTitle,
            file,
          }
        : null,
    applicationInfo:
      rawApplicationInfo && typeof rawApplicationInfo === "object"
        ? {
            ...rawApplicationInfo,
            reportTitle,
            file,
          }
        : {
            reportTitle,
            file,
          },
  };
}

function toApiSpeakerPhoto(photo) {
  return typeof photo === "string" && photo.trim() ? photo : null;
}

export function normalizeBookingRecord(booking) {
  if (!booking || typeof booking !== "object") return booking;

  return {
    ...booking,
    id: pickValue(booking, "id", "id"),
    email: pickValue(booking, "email", "email", ""),
    name: pickValue(booking, "name", "name", ""),
    bookedAt: pickValue(booking, "bookedAt", "booked_at", null),
    confirmationSentAt: pickValue(
      booking,
      "confirmationSentAt",
      "confirmation_sent_at",
      null,
    ),
    reminderSentAt: pickValue(
      booking,
      "reminderSentAt",
      "reminder_sent_at",
      null,
    ),
  };
}

export function normalizeFileRecord(file, userEmail = "") {
  if (!file) return file;

  if (typeof file !== "object") {
    return {
      id: file,
      name: String(file),
      size: 0,
      type: "",
      date: new Date().toLocaleString(),
      contentId: file,
      sourceUserEmail: userEmail,
    };
  }

  return {
    ...file,
    id: pickValue(file, "id", "id"),
    name:
      pickValue(file, "name", "original_name") ||
      pickValue(file, "originalName", "original_name") ||
      pickValue(file, "original_name", "original_name") ||
      "",
    size:
      pickValue(file, "size", "size_bytes") ||
      pickValue(file, "sizeBytes", "size_bytes") ||
      0,
    type:
      pickValue(file, "type", "mime") ||
      pickValue(file, "mime", "mime_type") ||
      pickValue(file, "mimeType", "mime_type") ||
      "",
    date:
      pickValue(file, "date", "created_at") ||
      pickValue(file, "createdAt", "created_at") ||
      new Date().toLocaleString(),
    contentId:
      pickValue(file, "contentId", "id") ||
      pickValue(file, "storedName", "stored_name") ||
      pickValue(file, "stored_name", "stored_name") ||
      pickValue(file, "id", "id"),
    sourceUserEmail:
      pickValue(file, "sourceUserEmail", "source_user_email") ||
      pickValue(file, "userEmail", "user_email") ||
      userEmail ||
      "",
    hash: pickValue(file, "hash", "hash", null),
    storedName: pickValue(file, "storedName", "stored_name", null),
    path: pickValue(file, "path", "storage_path", null),
    mime: pickValue(file, "mime", "mime_type", null),
    createdAt: pickValue(file, "createdAt", "created_at", null),
    updatedAt: pickValue(file, "updatedAt", "updated_at", null),
    downloadUrl: pickValue(file, "downloadUrl", "download_url", null),
  };
}

export function normalizeSpeakerSummaryRecord(speaker) {
  if (!speaker || typeof speaker !== "object") return speaker;

  const rawApplicationInfo =
    pickValue(speaker, "applicationInfo", "application_info", null) ||
    pickValue(speaker, "application", "application", null) ||
    pickValue(speaker, "speakerApplication", "speaker_application", null);
  const applicationInfo =
    rawApplicationInfo && typeof rawApplicationInfo === "object"
      ? normalizeApplicationRecord({
          ...rawApplicationInfo,
          user: null,
          requestUser: null,
          account: null,
        })
      : null;

  return {
    id: pickValue(speaker, "id", "id"),
    name: pickValue(speaker, "name", "name", ""),
    firstName: pickValue(speaker, "firstName", "first_name", ""),
    lastName: pickValue(speaker, "lastName", "last_name", ""),
    middleName: pickValue(speaker, "middleName", "middle_name", ""),
    email: pickValue(speaker, "email", "email", ""),
    bio: pickValue(speaker, "bio", "bio", ""),
    photo: pickValue(speaker, "photo", "photo", ""),
    applicationInfo,
    createdBy: pickValue(speaker, "createdBy", "created_by", null),
    createdAt: pickValue(speaker, "createdAt", "created_at", null),
    updatedAt: pickValue(speaker, "updatedAt", "updated_at", null),
  };
}

export function normalizeConferenceRecord(conference) {
  if (!conference || typeof conference !== "object") return conference;

  const legacySpeaker = conference.speaker
    ? normalizeSpeakerSummaryRecord(conference.speaker)
    : null;
  const rawSpeakers = [
    ...ensureArray(pickValue(conference, "speakers", "speakers", [])),
    ...ensureArray(
      pickValue(conference, "conferenceSpeakers", "conference_speakers", []),
    ),
  ];
  const normalizedSpeakers = rawSpeakers
    .map((speaker) => {
      const nestedSpeaker = speaker?.speaker || speaker;
      const applicationInfo =
        pickValue(nestedSpeaker, "applicationInfo", "application_info", null) ||
        pickValue(speaker, "applicationInfo", "application_info", null) ||
        pickValue(speaker, "application", "application", null) ||
        pickValue(speaker, "speakerApplication", "speaker_application", null);

      return normalizeSpeakerSummaryRecord({
        ...nestedSpeaker,
        applicationInfo,
      });
    })
    .filter((speaker) => speaker && typeof speaker === "object");
  const rawParticipants = pickValue(
    conference,
    "participants",
    "participants",
    null,
  );
  const participants = Array.isArray(rawParticipants)
    ? rawParticipants
        .map((participant) => {
          const nestedParticipant =
            participant?.participant ||
            participant?.person ||
            participant?.user ||
            participant?.speaker ||
            participant;
          const applicationInfo =
            pickValue(
              nestedParticipant,
              "applicationInfo",
              "application_info",
              null,
            ) ||
            pickValue(participant, "applicationInfo", "application_info", null) ||
            pickValue(participant, "application", "application", null) ||
            pickValue(
              participant,
              "speakerApplication",
              "speaker_application",
              null,
            ) ||
            pickValue(
              participant,
              "reviewerApplication",
              "reviewer_application",
              null,
            );

          return normalizeConferenceSectionSpeakerRecord({
            ...participant,
            ...nestedParticipant,
            applicationInfo,
          });
        })
        .filter((participant) => participant && typeof participant === "object")
    : null;
  const candidateSpeakers =
    normalizedSpeakers.length > 0
      ? normalizedSpeakers
      : legacySpeaker
        ? [legacySpeaker]
        : [];
  const speakerKeys = new Set();
  const speakers = candidateSpeakers.filter((speaker) => {
    const key =
      speaker.id ||
      speaker.email ||
      `${speaker.firstName || ""}|${speaker.lastName || ""}`;

    if (!key) return true;
    if (speakerKeys.has(key)) return false;
    speakerKeys.add(key);
    return true;
  });
  const usedFiles = ensureArray(
    pickValue(conference, "usedFiles", "used_files", []),
  ).map((file) => normalizeFileRecord(file));

  const bookings = ensureArray(
    pickValue(conference, "bookings", "bookings", []),
  ).map((booking) => normalizeBookingRecord(booking));

  const sections = [
    ...ensureArray(pickValue(conference, "sections", "sections", [])),
    ...ensureArray(
      pickValue(conference, "conferenceSections", "conference_sections", []),
    ),
  ]
    .map((section) =>
      normalizeConferenceSectionRecord(section?.section || section),
    )
    .filter((section) => section && typeof section === "object");

  const embeddedApplicationCandidates = [
    ...ensureArray(pickValue(conference, "applications", "applications", [])),
    ...ensureArray(
      pickValue(conference, "myApplications", "my_applications", []),
    ),
    ...ensureArray(
      pickValue(conference, "userApplications", "user_applications", []),
    ),
  ];
  const singleApplication =
    pickValue(conference, "application", "application") ||
    pickValue(conference, "myApplication", "my_application") ||
    pickValue(conference, "userApplication", "user_application", null);
  if (singleApplication) {
    embeddedApplicationCandidates.push(singleApplication);
  }
  const applications = embeddedApplicationCandidates
    .map(normalizeApplicationRecord)
    .filter((application) => application && typeof application === "object");
  const sectionSpeakers = sections.flatMap((section) =>
    ensureArray(section?.speakers),
  );
  const conferenceSpeakerKeys = new Set();
  const conferenceSpeakers = [...speakers, ...sectionSpeakers].filter(
    (speaker) => {
      const key =
        speaker?.id ||
        speaker?.applicationId ||
        speaker?.participantId ||
        speaker?.name ||
        `${speaker?.firstName || ""}|${speaker?.lastName || ""}`;

      if (!key || key === "|") return true;
      if (conferenceSpeakerKeys.has(String(key))) return false;
      conferenceSpeakerKeys.add(String(key));
      return true;
    },
  );
  const primarySpeaker = conferenceSpeakers[0] || legacySpeaker || null;

  return {
    ...conference,
    id: pickValue(conference, "id", "id"),
    name: pickValue(conference, "name", "name", ""),
    description: pickValue(conference, "description", "description", ""),
    topic: pickValue(conference, "topic", "topic", "technology"),
    date: pickValue(conference, "date", "date", ""),
    time: pickValue(conference, "time", "time", ""),
    speakerId: pickValue(conference, "speakerId", "speaker_id", null),
    createdBy: pickValue(conference, "createdBy", "created_by", null),
    createdAt: pickValue(conference, "createdAt", "created_at", null),
    updatedAt: pickValue(conference, "updatedAt", "updated_at", null),
    speaker: primarySpeaker,
    speakers: conferenceSpeakers,
    participants,
    usedFiles,
    bookings,
    sections,
    applications,
  };
}

export function normalizeUserRecord(user) {
  if (!user || typeof user !== "object") return user;

  const firstName = pickValue(user, "firstName", "first_name", "");
  const lastName = pickValue(user, "lastName", "last_name", "");
  const rawSpeakerApplications = ensureArray(
    pickValue(user, "speakerApplications", "speaker_applications", []),
  );
  const rawReviewerApplications = ensureArray(
    pickValue(user, "reviewerApplications", "reviewer_applications", []),
  );
  const rawSpeakerConferences = ensureArray(
    pickValue(user, "speakerConferences", "speaker_conferences", []),
  );
  const rawReviewerConferences = ensureArray(
    pickValue(user, "reviewerConferences", "reviewer_conferences", []),
  );
  const speakerApplications = rawSpeakerApplications
    .map(normalizeProfileApplicationRecord)
    .filter((application) => application && typeof application === "object");
  const reviewerApplications = rawReviewerApplications
    .map(normalizeProfileApplicationRecord)
    .filter((application) => application && typeof application === "object");
  const speakerConferences = rawSpeakerConferences
    .map(normalizeConferenceRecord)
    .filter((conference) => conference && typeof conference === "object");
  const reviewerConferences = rawReviewerConferences
    .map(normalizeConferenceRecord)
    .filter((conference) => conference && typeof conference === "object");
  const legacySpeakerStatus = pickValue(
    user,
    "speakerStatus",
    "speaker_status",
    "none",
  );
  const legacyReviewerStatus = pickValue(
    user,
    "reviewerStatus",
    "reviewer_status",
    "none",
  );
  const rawParticipation =
    user.participation && typeof user.participation === "object"
      ? user.participation
      : {};
  const speakerParticipation = normalizeParticipationRoleRecord(
    rawParticipation.speaker,
    legacySpeakerStatus,
    speakerApplications,
    speakerConferences,
  );
  const reviewerParticipation = normalizeParticipationRoleRecord(
    rawParticipation.reviewer,
    legacyReviewerStatus,
    reviewerApplications,
    reviewerConferences,
  );
  const capabilities =
    user.capabilities && typeof user.capabilities === "object"
      ? user.capabilities
      : {};
  const name =
    pickValue(user, "name", "name", "") ||
    `${firstName} ${lastName}`.trim() ||
    pickValue(user, "email", "email", "");

  return {
    ...user,
    id: pickValue(user, "id", "id"),
    firstName,
    lastName,
    name,
    email: pickValue(user, "email", "email", ""),
    role: pickValue(user, "role", "role", "user"),
    speakerStatus: speakerParticipation.status || legacySpeakerStatus,
    reviewerStatus: reviewerParticipation.status || legacyReviewerStatus,
    speakerApplications: speakerParticipation.applications,
    reviewerApplications: reviewerParticipation.applications,
    speakerConferences: speakerParticipation.conferences,
    reviewerConferences: reviewerParticipation.conferences,
    participation: {
      ...rawParticipation,
      speaker: speakerParticipation,
      reviewer: reviewerParticipation,
    },
    capabilities: {
      ...capabilities,
      speaker: Boolean(capabilities.speaker),
      reviewer: Boolean(capabilities.reviewer),
    },
    isActive: pickValue(user, "isActive", "is_active", true),
    participantId: pickValue(user, "participantId", "participant_id", null),
    createdAt: pickValue(user, "createdAt", "created_at", null),
    updatedAt: pickValue(user, "updatedAt", "updated_at", null),
  };
}

export function normalizeApplicationRecord(application) {
  if (!application || typeof application !== "object") return application;

  const user = normalizeUserRecord(
    application.user || application.requestUser || application.account || null,
  );
  const rawConference = application.conference || application.event || null;
  const rawSection = application.section || application.conferenceSection || null;
  const rawReport = application.report || null;
  const rawFile = application.file || rawReport?.file || null;
  const rawReviewerAccess = pickValue(
    application,
    "reviewerAccess",
    "reviewer_access",
    null,
  );
  const reviewerScope =
    pickValue(application, "reviewerScope", "reviewer_scope", "") ||
    pickValue(rawReviewerAccess, "scope", "scope", "");
  const reviewerSectionIds = ensureArray(
    pickValue(
      application,
      "reviewerSectionIds",
      "reviewer_section_ids",
      pickValue(rawReviewerAccess, "sectionIds", "section_ids", []),
    ),
  );
  const reviewerConferenceSectionIds = ensureArray(
    pickValue(
      application,
      "conferenceSectionIds",
      "conference_section_ids",
      pickValue(rawReviewerAccess, "conferenceSectionIds", "conference_section_ids", []),
    ),
  );
  const reviewerGlobalSectionIds = ensureArray(
    pickValue(
      application,
      "globalSectionIds",
      "global_section_ids",
      pickValue(rawReviewerAccess, "globalSectionIds", "global_section_ids", []),
    ),
  );
  const appliesToAllConferences =
    reviewerScope === "global_section" ||
    normalizeBoolean(
      pickValue(
        application,
        "appliesToAllConferences",
        "applies_to_all_conferences",
        false,
      ),
    );
  const file = rawFile
    ? normalizeFileRecord(rawFile, user?.email || "")
    : null;

  const firstName = pickValue(application, "firstName", "first_name", "");
  const lastName = pickValue(application, "lastName", "last_name", "");
  const userName =
    pickValue(application, "userName", "user_name") ||
    `${firstName} ${lastName}`.trim() ||
    user?.name ||
    "";
  const statusComment = pickValue(application, "statusComment", "status_comment", "");
  const adminComment = pickValue(application, "adminComment", "admin_comment", "");
  const rejectionReason = pickValue(
    application,
    "rejectionReason",
    "rejection_reason",
    statusComment || adminComment || "",
  );

  return {
    ...application,
    id: pickValue(application, "id", "id"),
    type: pickValue(application, "type", "type", ""),
    status: pickValue(application, "status", "status", "pending"),
    statusName: pickValue(application, "statusName", "status_name", ""),
    statusComment,
    adminComment,
    rejectionReason,
    reviewerScope,
    reviewerSectionIds,
    reviewerConferenceSectionIds,
    reviewerGlobalSectionIds,
    appliesToAllConferences,
    reviewerAccess:
      rawReviewerAccess && typeof rawReviewerAccess === "object"
        ? {
            ...rawReviewerAccess,
            scope: reviewerScope,
            sectionIds: reviewerSectionIds,
            conferenceSectionIds: reviewerConferenceSectionIds,
            globalSectionIds: reviewerGlobalSectionIds,
          }
        : null,
    sectionId:
      pickValue(application, "sectionId", "section_id") ||
      rawSection?.id ||
      null,
    sectionName:
      pickValue(application, "sectionName", "section_name") ||
      rawSection?.name ||
      rawSection?.title ||
      "",
    lastName,
    firstName,
    middleName: pickValue(application, "middleName", "middle_name", ""),
    email:
      pickValue(application, "email", "email") ||
      pickValue(application, "userEmail", "user_email") ||
      user?.email ||
      "",
    phone: pickValue(application, "phone", "phone", ""),
    country: pickValue(application, "country", "country", ""),
    organization: pickValue(application, "organization", "organization", ""),
    educationStatus: pickValue(
      application,
      "educationStatus",
      "education_status",
      "",
    ),
    educationForm: pickValue(
      application,
      "educationForm",
      "education_form",
      "",
    ),
    fundingForm: pickValue(application, "fundingForm", "funding_form", ""),
    reportTitle:
      pickValue(application, "reportTitle", "report_title") ||
      rawReport?.title ||
      "",
    additionalInfo: pickValue(
      application,
      "additionalInfo",
      "additional_info",
      "",
    ),
    commentForReviewer: pickValue(
      application,
      "commentForReviewer",
      "comment_for_reviewer",
      "",
    ),
    degree:
      pickValue(application, "degree", "degree") ||
      application.degree?.name ||
      application.degree?.title ||
      "",
    academicTitle:
      pickValue(application, "academicTitle", "academic_title") ||
      pickValue(application, "title", "title") ||
      application.title?.name ||
      application.title?.title ||
      "",
    fileId:
      pickValue(application, "fileId", "file_id") ||
      file?.id ||
      file?.contentId ||
      null,
    fileName:
      pickValue(application, "fileName", "file_name") ||
      file?.name ||
      "",
    fileUrl:
      pickValue(application, "fileUrl", "file_url") ||
      file?.downloadUrl ||
      "",
    userId:
      pickValue(application, "userId", "user_id") ||
      user?.id ||
      user?.participantId ||
      null,
    userEmail:
      pickValue(application, "userEmail", "user_email") ||
      pickValue(application, "email", "email") ||
      user?.email ||
      "",
    userName,
    conferenceId:
      pickValue(application, "conferenceId", "conference_id") ||
      rawConference?.id ||
      null,
    conferenceName:
      pickValue(application, "conferenceName", "conference_name") ||
      pickValue(application, "conferenceTitle", "conference_title") ||
      rawConference?.name ||
      rawConference?.title ||
      "",
    createdAt:
      pickValue(application, "createdAt", "created_at") ||
      pickValue(application, "submittedAt", "submitted_at") ||
      pickValue(application, "date", "date", null),
    submittedAt:
      pickValue(application, "submittedAt", "submitted_at") ||
      pickValue(application, "createdAt", "created_at") ||
      pickValue(application, "date", "date", null),
    updatedAt: pickValue(application, "updatedAt", "updated_at", null),
    user,
    conference: rawConference
      ? {
          ...rawConference,
          id: rawConference.id,
          name: rawConference.name || rawConference.title || "",
        }
      : null,
    section: rawSection
      ? normalizeConferenceSectionRecord(rawSection)
      : null,
    report: rawReport
      ? {
          ...rawReport,
          id: pickValue(rawReport, "id", "id"),
          title:
            pickValue(rawReport, "title", "title") ||
            pickValue(application, "reportTitle", "report_title") ||
            "",
          file,
        }
      : null,
    file,
  };
}

export function normalizeReviewReportRecord(report) {
  if (!report || typeof report !== "object") return report;

  const rawFile = pickValue(report, "file", "file", null);
  const file =
    rawFile && typeof rawFile === "object"
      ? normalizeFileRecord(rawFile)
      : rawFile
        ? normalizeFileRecord({
            id: rawFile,
            name: String(rawFile),
          })
        : null;

  return {
    ...report,
    id: pickValue(report, "id", "id"),
    title: pickValue(report, "title", "title", ""),
    topic: pickValue(report, "topic", "topic", ""),
    date: pickValue(report, "date", "date", null),
    file,
  };
}

export function normalizeReviewSpeakerApplicationRecord(application) {
  if (!application || typeof application !== "object") return application;

  const rawSpeaker =
    application.speaker ||
    application.user ||
    application.participant ||
    null;
  const firstName = pickValue(rawSpeaker, "firstName", "first_name", "");
  const lastName = pickValue(rawSpeaker, "lastName", "last_name", "");
  const middleName = pickValue(rawSpeaker, "middleName", "middle_name", "");
  const name =
    pickValue(rawSpeaker, "name", "name", "") ||
    [lastName, firstName, middleName].filter(Boolean).join(" ").trim();
  const rawApplicationInfo =
    pickValue(application, "applicationInfo", "application_info", {}) || {};

  return {
    ...application,
    id: pickValue(application, "id", "id"),
    status: pickValue(application, "status", "status", ""),
    speaker: rawSpeaker
      ? {
          ...rawSpeaker,
          id: pickValue(rawSpeaker, "id", "id"),
          participantId: pickValue(
            rawSpeaker,
            "participantId",
            "participant_id",
            null,
          ),
          firstName,
          lastName,
          middleName,
          name,
        }
      : null,
    section: application.section
      ? normalizeConferenceSectionRecord(application.section)
      : null,
    applicationInfo:
      rawApplicationInfo && typeof rawApplicationInfo === "object"
        ? {
            ...rawApplicationInfo,
            country: pickValue(rawApplicationInfo, "country", "country", ""),
            organization: pickValue(
              rawApplicationInfo,
              "organization",
              "organization",
              "",
            ),
            educationStatus: pickValue(
              rawApplicationInfo,
              "educationStatus",
              "education_status",
              "",
            ),
            educationForm: pickValue(
              rawApplicationInfo,
              "educationForm",
              "education_form",
              "",
            ),
            fundingForm: pickValue(
              rawApplicationInfo,
              "fundingForm",
              "funding_form",
              "",
            ),
            additionalInfo: pickValue(
              rawApplicationInfo,
              "additionalInfo",
              "additional_info",
              "",
            ),
          }
        : {},
    report: application.report
      ? normalizeReviewReportRecord(application.report)
      : null,
  };
}

export function normalizeReviewRecord(review) {
  if (!review || typeof review !== "object") return review;

  const rawConference = review.conference || null;
  const rawReviewer = review.reviewer || review.reviewUser || null;
  const viewerRoles = ensureArray(
    pickValue(review, "viewerRoles", "viewer_roles", []),
  );

  return {
    ...review,
    id: pickValue(review, "id", "id"),
    status: pickValue(review, "status", "status", "assigned"),
    score: pickValue(
      review,
      "score",
      "score",
      pickValue(review, "rating", "rating", null),
    ),
    decision: pickValue(
      review,
      "decision",
      "decision",
      pickValue(review, "recommendation", "recommendation", null),
    ),
    comment: pickValue(
      review,
      "comment",
      "comment",
      pickValue(
        review,
        "reviewText",
        "review_text",
        pickValue(review, "text", "text", null),
      ),
    ),
    canEdit: Boolean(pickValue(review, "canEdit", "can_edit", true)),
    assignedAt: pickValue(review, "assignedAt", "assigned_at", null),
    submittedAt: pickValue(review, "submittedAt", "submitted_at", null),
    viewerRoles,
    conference: rawConference
      ? {
          ...rawConference,
          id: pickValue(rawConference, "id", "id"),
          name: pickValue(rawConference, "name", "name", ""),
          topic: pickValue(rawConference, "topic", "topic", ""),
          date: pickValue(rawConference, "date", "date", ""),
          time: pickValue(rawConference, "time", "time", ""),
        }
      : null,
    speakerApplication: normalizeReviewSpeakerApplicationRecord(
      pickValue(review, "speakerApplication", "speaker_application", null),
    ),
    reviewer: rawReviewer ? normalizeUserRecord(rawReviewer) : null,
    assignedBy: pickValue(review, "assignedBy", "assigned_by", null),
  };
}

export function normalizeReviewerConferenceRecord(conference) {
  if (!conference || typeof conference !== "object") return conference;

  const rawReviewerAccess = pickValue(
    conference,
    "reviewerAccess",
    "reviewer_access",
    null,
  );
  const reviewerScope =
    pickValue(conference, "reviewerScope", "reviewer_scope", "") ||
    pickValue(rawReviewerAccess, "scope", "scope", "");
  const reviewerSectionIds = ensureArray(
    pickValue(
      conference,
      "reviewerSectionIds",
      "reviewer_section_ids",
      pickValue(rawReviewerAccess, "sectionIds", "section_ids", []),
    ),
  );
  const reviewerConferenceSectionIds = ensureArray(
    pickValue(
      conference,
      "conferenceSectionIds",
      "conference_section_ids",
      pickValue(rawReviewerAccess, "conferenceSectionIds", "conference_section_ids", []),
    ),
  );
  const reviewerGlobalSectionIds = ensureArray(
    pickValue(
      conference,
      "globalSectionIds",
      "global_section_ids",
      pickValue(rawReviewerAccess, "globalSectionIds", "global_section_ids", []),
    ),
  );
  const appliesToAllConferences =
    reviewerScope === "global_section" ||
    normalizeBoolean(
      pickValue(
        conference,
        "appliesToAllConferences",
        "applies_to_all_conferences",
        false,
      ),
    );
  const rawSpeakerItems = [
    ...ensureArray(pickValue(conference, "speakers", "speakers", [])),
    ...ensureArray(
      pickValue(conference, "speakerApplications", "speaker_applications", []),
    ),
    ...ensureArray(
      pickValue(conference, "conferenceSpeakers", "conference_speakers", []),
    ),
    ...ensureArray(pickValue(conference, "applications", "applications", [])),
  ];
  const singleSpeaker =
    pickValue(conference, "speaker", "speaker", null) ||
    pickValue(conference, "speakerApplication", "speaker_application", null);

  if (singleSpeaker) {
    rawSpeakerItems.push(singleSpeaker);
  }

  const speakers = rawSpeakerItems
    .map((item) => {
      const application =
        item?.speakerApplication ||
        item?.speaker_application ||
        (item?.type === "speaker" ? item : null) ||
        item?.application ||
        item;
      const rawSpeaker =
        application?.speaker ||
        item?.speaker ||
        item?.user ||
        item?.participant ||
        application?.user ||
        application;
      const rawApplicationInfo =
        pickValue(application, "applicationInfo", "application_info", null) ||
        pickValue(item, "applicationInfo", "application_info", null) ||
        {};
      const rawReport = application?.report || item?.report || rawSpeaker?.report || null;
      const rawFile =
        pickValue(rawSpeaker, "file", "file", null) ||
        pickValue(application, "file", "file", null) ||
        rawReport?.file ||
        pickValue(rawApplicationInfo, "file", "file", null) ||
        pickValue(item, "file", "file", null);
      const file = rawFile ? normalizeFileRecord(rawFile) : null;
      const reportTitle =
        pickValue(application, "reportTitle", "report_title", "") ||
        pickValue(rawSpeaker, "reportTitle", "report_title", "") ||
        pickValue(item, "reportTitle", "report_title", "") ||
        rawReport?.title ||
        "";
      const report =
        rawReport || file || reportTitle
          ? normalizeReviewReportRecord({
              ...(rawReport || {}),
              title: rawReport?.title || reportTitle,
              file,
            })
          : null;
      const firstName = pickValue(rawSpeaker, "firstName", "first_name", "");
      const lastName = pickValue(rawSpeaker, "lastName", "last_name", "");
      const middleName = pickValue(rawSpeaker, "middleName", "middle_name", "");
      const name =
        pickValue(rawSpeaker, "name", "name", "") ||
        [lastName, firstName, middleName].filter(Boolean).join(" ").trim();
      const authorStatus =
        pickValue(rawSpeaker, "authorStatus", "author_status", "") ||
        pickValue(rawApplicationInfo, "authorStatus", "author_status", "") ||
        pickValue(application, "authorStatus", "author_status", "");
      const educationStatus =
        pickValue(rawSpeaker, "educationStatus", "education_status", "") ||
        pickValue(rawApplicationInfo, "educationStatus", "education_status", "") ||
        pickValue(application, "educationStatus", "education_status", "");
      const commentForReviewer =
        pickValue(rawSpeaker, "commentForReviewer", "comment_for_reviewer", "") ||
        pickValue(rawApplicationInfo, "commentForReviewer", "comment_for_reviewer", "") ||
        pickValue(application, "commentForReviewer", "comment_for_reviewer", "");
      const reviewerComment =
        pickValue(rawSpeaker, "reviewerComment", "reviewer_comment", "") ||
        pickValue(rawApplicationInfo, "reviewerComment", "reviewer_comment", "") ||
        pickValue(application, "reviewerComment", "reviewer_comment", "");

      return {
        id:
          pickValue(rawSpeaker, "id", "id") ||
          pickValue(application, "id", "id") ||
          null,
        participantId: pickValue(
          rawSpeaker,
          "participantId",
          "participant_id",
          null,
        ),
        firstName,
        lastName,
        middleName,
        name,
        organization:
          pickValue(rawApplicationInfo, "organization", "organization", "") ||
          pickValue(application, "organization", "organization", ""),
        country:
          pickValue(rawApplicationInfo, "country", "country", "") ||
          pickValue(application, "country", "country", ""),
        additionalInfo:
          pickValue(rawApplicationInfo, "additionalInfo", "additional_info", "") ||
          pickValue(application, "additionalInfo", "additional_info", ""),
        authorStatus,
        educationStatus,
        commentForReviewer,
        reviewerComment,
        applicationInfo:
          rawApplicationInfo && typeof rawApplicationInfo === "object"
            ? {
                ...rawApplicationInfo,
                country: pickValue(rawApplicationInfo, "country", "country", ""),
                organization: pickValue(
                  rawApplicationInfo,
                  "organization",
                  "organization",
                  "",
                ),
                additionalInfo: pickValue(
                  rawApplicationInfo,
                  "additionalInfo",
                  "additional_info",
                  "",
                ),
                authorStatus:
                  pickValue(rawApplicationInfo, "authorStatus", "author_status", "") ||
                  authorStatus,
                educationStatus:
                  pickValue(rawApplicationInfo, "educationStatus", "education_status", "") ||
                  educationStatus,
                commentForReviewer:
                  pickValue(
                    rawApplicationInfo,
                    "commentForReviewer",
                    "comment_for_reviewer",
                    "",
                  ) || commentForReviewer,
                reviewerComment:
                  pickValue(rawApplicationInfo, "reviewerComment", "reviewer_comment", "") ||
                  reviewerComment,
                file,
              }
            : {},
        file,
        report,
        reportTitle: report?.title || reportTitle,
        section: application?.section
          ? normalizeConferenceSectionRecord(application.section)
          : null,
      };
    })
    .filter((speaker) => speaker && (speaker.name || speaker.reportTitle || speaker.report));

  return {
    ...conference,
    id: pickValue(conference, "id", "id"),
    name: pickValue(conference, "name", "name", ""),
    topic: pickValue(conference, "topic", "topic", ""),
    date: pickValue(conference, "date", "date", ""),
    time: pickValue(conference, "time", "time", ""),
    reviewerScope,
    reviewerSectionIds,
    reviewerConferenceSectionIds,
    reviewerGlobalSectionIds,
    appliesToAllConferences,
    reviewerAccess:
      rawReviewerAccess && typeof rawReviewerAccess === "object"
        ? {
            ...rawReviewerAccess,
            scope: reviewerScope,
            sectionIds: reviewerSectionIds,
            conferenceSectionIds: reviewerConferenceSectionIds,
            globalSectionIds: reviewerGlobalSectionIds,
          }
        : reviewerScope
          ? {
              scope: reviewerScope,
              sectionIds: reviewerSectionIds,
              conferenceSectionIds: reviewerConferenceSectionIds,
              globalSectionIds: reviewerGlobalSectionIds,
            }
          : null,
    speakers,
  };
}

export function normalizeRoleRequestRecord(request) {
  if (!request || typeof request !== "object") return request;

  const user = normalizeUserRecord(
    request.user || request.requestUser || request.account || null,
  );
  const conference = normalizeConferenceRecord(
    request.conference || request.event || null,
  );

  return {
    ...request,
    id: pickValue(request, "id", "id"),
    type: pickValue(request, "type", "type", ""),
    status: pickValue(request, "status", "status", "pending"),
    comment: pickValue(request, "comment", "comment", ""),
    userId:
      pickValue(request, "userId", "user_id") ||
      user?.id ||
      user?.participantId ||
      null,
    userEmail:
      pickValue(request, "userEmail", "user_email") ||
      pickValue(request, "email", "email") ||
      user?.email ||
      "",
    userName:
      pickValue(request, "userName", "user_name") || user?.name || "",
    conferenceId:
      pickValue(request, "conferenceId", "conference_id") ||
      conference?.id ||
      null,
    conferenceName:
      pickValue(request, "conferenceName", "conference_name") ||
      pickValue(request, "conferenceTitle", "conference_title") ||
      conference?.name ||
      "",
    createdAt:
      pickValue(request, "createdAt", "created_at") ||
      pickValue(request, "submittedAt", "submitted_at") ||
      pickValue(request, "date", "date", null),
    updatedAt: pickValue(request, "updatedAt", "updated_at", null),
    user,
    conference,
  };
}

export function normalizeSpeakerRecord(speaker) {
  if (!speaker || typeof speaker !== "object") return speaker;

  const firstName = pickValue(speaker, "firstName", "first_name", "");
  const lastName = pickValue(speaker, "lastName", "last_name", "");
  const name =
    pickValue(speaker, "name", "name", "") || `${firstName} ${lastName}`.trim();

  return {
    ...normalizeSpeakerSummaryRecord(speaker),
    name,
    conferences: ensureArray(
      pickValue(speaker, "conferences", "conferences", []),
    ).map((conference) =>
      normalizeConferenceRecord({
        ...conference,
        speaker: conference?.speaker || null,
        used_files: conference?.used_files || conference?.usedFiles || [],
        bookings: conference?.bookings || [],
      }),
    ),
  };
}

export function toSpeakerPayload(speaker = {}) {
  return {
    firstName: speaker.firstName || speaker.first_name || "",
    lastName: speaker.lastName || speaker.last_name || "",
    email: speaker.email || "",
    bio: speaker.bio || null,
    photo: toApiSpeakerPhoto(speaker.photo),
  };
}

export function toConferencePayload(conference = {}) {
  const usedFiles = ensureArray(conference.usedFiles || conference.used_files);
  const rawSectionIds = ensureArray(
    conference.sectionIds || conference.section_ids,
  ).concat(
    ensureArray(conference.sections).map(
      (section) => section?.id || section?.sectionId || section?.section_id,
    ),
  );
  const sectionIds = rawSectionIds
    .map((id) => {
      const numericId = Number(id);
      return Number.isFinite(numericId) ? numericId : id;
    })
    .filter((id) => id !== undefined && id !== null && id !== "");
  const usedFileIds = ensureArray(
    conference.usedFileIds || conference.used_file_ids,
  )
    .concat(ensureArray(conference.fileIds || conference.file_ids))
    .concat(
      usedFiles.map((file) => file?.id || file?.contentId || file?.file_id),
    )
    .filter(Boolean);

  const payload = {
    name: conference.name || "",
    description: conference.description || "",
    topic: conference.topic || "technology",
    date: conference.date || "",
    time: conference.time || "",
    sectionIds: [...new Set(sectionIds)],
  };

  payload.usedFileIds = [...new Set(usedFileIds)];

  return payload;
}
