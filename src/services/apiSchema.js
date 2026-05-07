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

  return {
    id: pickValue(speaker, "id", "id"),
    firstName: pickValue(speaker, "firstName", "first_name", ""),
    lastName: pickValue(speaker, "lastName", "last_name", ""),
    email: pickValue(speaker, "email", "email", ""),
    bio: pickValue(speaker, "bio", "bio", ""),
    photo: pickValue(speaker, "photo", "photo", ""),
    createdBy: pickValue(speaker, "createdBy", "created_by", null),
    createdAt: pickValue(speaker, "createdAt", "created_at", null),
    updatedAt: pickValue(speaker, "updatedAt", "updated_at", null),
  };
}

export function normalizeConferenceRecord(conference) {
  if (!conference || typeof conference !== "object") return conference;

  const normalizedSpeaker = conference.speaker
    ? normalizeSpeakerSummaryRecord(conference.speaker)
    : null;

  const usedFiles = ensureArray(
    pickValue(conference, "usedFiles", "used_files", []),
  ).map((file) => normalizeFileRecord(file));

  const bookings = ensureArray(
    pickValue(conference, "bookings", "bookings", []),
  ).map((booking) => normalizeBookingRecord(booking));

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
    speaker: normalizedSpeaker,
    usedFiles,
    bookings,
  };
}

export function normalizeUserRecord(user) {
  if (!user || typeof user !== "object") return user;

  const firstName = pickValue(user, "firstName", "first_name", "");
  const lastName = pickValue(user, "lastName", "last_name", "");
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
    isActive: pickValue(user, "isActive", "is_active", true),
    participantId: pickValue(user, "participantId", "participant_id", null),
    createdAt: pickValue(user, "createdAt", "created_at", null),
    updatedAt: pickValue(user, "updatedAt", "updated_at", null),
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
    first_name:
      speaker.firstName || speaker.first_name || speaker.first_name || "",
    last_name: speaker.lastName || speaker.last_name || "",
    email: speaker.email || "",
    bio: speaker.bio || "",
    photo: speaker.photo || "",
    created_by: speaker.createdBy || speaker.created_by || null,
  };
}

export function toConferencePayload(conference = {}) {
  const usedFiles = ensureArray(conference.usedFiles || conference.used_files);
  const fileIds = ensureArray(conference.fileIds || conference.file_ids)
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
  };

  if (conference.speakerId || conference.speaker_id) {
    payload.speaker_id = conference.speakerId || conference.speaker_id;
  }

  if (conference.createdBy || conference.created_by) {
    payload.created_by = conference.createdBy || conference.created_by;
  }

  if (conference.speaker) {
    payload.speaker = toSpeakerPayload(conference.speaker);
  }

  if (fileIds.length > 0) {
    payload.file_ids = [...new Set(fileIds)];
  }

  return payload;
}
