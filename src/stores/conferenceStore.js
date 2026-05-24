import { defineStore } from "pinia";
import * as storageService from "../services/storageService";
import * as applicationService from "../services/applicationService";
import { useAuthStore } from "./authStore";
import {
  apiRequestJSON,
  getStoredAuthToken,
  isApiConfigured,
} from "../services/apiClient";
import {
  normalizeApplicationRecord,
  normalizeConferenceRecord,
  toConferencePayload,
} from "../services/apiSchema";

function parseConferenceDate(conference) {
  if (!conference?.date) return null;
  const timePart = conference.time || "00:00";
  const parsed = new Date(`${conference.date}T${timePart}:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isConferenceInFuture(conference, now = new Date()) {
  const conferenceDate = parseConferenceDate(conference);
  if (!conferenceDate) return false;
  return conferenceDate.getTime() > now.getTime();
}

function buildConferenceQuery(filters = {}) {
  const params = new URLSearchParams();

  if (filters.topic && filters.topic !== "all") {
    params.set("topic", String(filters.topic));
  }

  if (filters.sectionId && filters.sectionId !== "all") {
    params.set("sectionId", String(filters.sectionId));
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}

function applyLocalConferenceFilters(conferences, filters = {}) {
  return conferences.filter((conference) => {
    const matchesTopic =
      !filters.topic ||
      filters.topic === "all" ||
      conference?.topic === filters.topic;
    const matchesSection =
      !filters.sectionId ||
      filters.sectionId === "all" ||
      (conference?.sections || []).some(
        (section) => String(section?.id) === String(filters.sectionId),
      );

    return matchesTopic && matchesSection;
  });
}

function getApplicationKey(application) {
  return String(
    application?.id ||
      `${application?.type || ""}|${application?.conferenceId || ""}|${
        application?.sectionId || ""
      }|${application?.status || ""}`,
  );
}

function mergeApplications(currentApplications = [], nextApplications = []) {
  const merged = [...currentApplications];
  const knownKeys = new Set(merged.map(getApplicationKey));

  nextApplications.forEach((application) => {
    const key = getApplicationKey(application);
    if (!key || knownKeys.has(key)) return;

    knownKeys.add(key);
    merged.push(application);
  });

  return merged;
}

function extractProfileApplications(user) {
  if (!user || typeof user !== "object") return [];

  const participation = user.participation || {};
  return [
    ...(Array.isArray(user.speakerApplications)
      ? user.speakerApplications
      : []),
    ...(Array.isArray(user.reviewerApplications)
      ? user.reviewerApplications
      : []),
    ...(Array.isArray(participation.speaker?.applications)
      ? participation.speaker.applications
      : []),
    ...(Array.isArray(participation.reviewer?.applications)
      ? participation.reviewer.applications
      : []),
  ]
    .map(normalizeApplicationRecord)
    .filter((application) => application && typeof application === "object");
}

export const useConferenceStore = defineStore("conference", {
  state: () => ({
    conferences: isApiConfigured()
      ? []
      : storageService.getJSON("conferences", []).map(normalizeConferenceRecord),
    isLoading: false,
    isLoadingApplications: false,
    applicationsByConferenceId: {},
  }),

  actions: {
    async loadConferences(filters = {}) {
      if (!isApiConfigured()) {
        this.conferences = storageService
          .getJSON("conferences", [])
          .map(normalizeConferenceRecord);
        this.conferences = applyLocalConferenceFilters(this.conferences, filters);
        return this.conferences;
      }

      if (!getStoredAuthToken()) {
        this.conferences = [];
        this.applicationsByConferenceId = {};
        return this.conferences;
      }

      this.isLoading = true;
      try {
        const response = await apiRequestJSON(
          `/conferences${buildConferenceQuery(filters)}`,
          {
            method: "GET",
          },
        );
        const conferences = Array.isArray(response)
          ? response
          : response?.data || response?.conferences || [];
        this.conferences = conferences.map(normalizeConferenceRecord);
        this.hydrateEmbeddedApplications();
        return this.conferences;
      } catch (error) {
        if (![401, 403].includes(Number(error?.status || 0))) {
          console.error("loadConferences error:", error);
        }
        this.conferences = [];
        return this.conferences;
      } finally {
        this.isLoading = false;
      }
    },

    async addConference(conference) {
      const payload = toConferencePayload(conference);
      console.log("create conference payload", payload);

      if (isApiConfigured()) {
        const response = await apiRequestJSON("/conferences", {
          method: "POST",
          body: payload,
        });
        const createdConference = normalizeConferenceRecord(
          response?.data || response?.conference || response,
        );
        this.conferences = [...this.conferences, createdConference];
        return createdConference;
      }

      const newConference = {
        id: Date.now(),
        ...payload,
        createdAt: new Date().toLocaleDateString("ru-RU"),
      };
      const nextConferences = [...this.conferences, newConference];
      if (!storageService.setJSON("conferences", nextConferences)) {
        return null;
      }
      this.conferences = nextConferences;
      return newConference;
    },

    getConferences() {
      if (!isApiConfigured()) {
        // Убедимся, что мы всегда получаем свежие данные из localStorage
        const stored = storageService
          .getJSON("conferences", [])
          .map(normalizeConferenceRecord);
        // Обновим состояние, если есть различия
        if (JSON.stringify(this.conferences) !== JSON.stringify(stored)) {
          this.conferences = stored;
        }
      }
      return this.conferences;
    },

    getConferenceById(id) {
      return this.conferences.find((conf) => String(conf.id) === String(id));
    },

    hydrateEmbeddedApplications() {
      const nextApplications = { ...this.applicationsByConferenceId };

      this.conferences.forEach((conference) => {
        const applications =
          applicationService.extractEmbeddedConferenceApplications(conference);
        if (applications.length > 0) {
          nextApplications[String(conference.id)] = applications;
        }
      });

      this.applicationsByConferenceId = nextApplications;
    },

    hydrateProfileApplications(user) {
      const profileApplications = extractProfileApplications(user);
      if (profileApplications.length === 0) return;

      const nextApplications = { ...this.applicationsByConferenceId };
      profileApplications.forEach((application) => {
        const conferenceId =
          application?.conferenceId || application?.conference?.id || null;
        if (!conferenceId) return;

        const key = String(conferenceId);
        nextApplications[key] = mergeApplications(nextApplications[key], [
          application,
        ]);
      });

      this.applicationsByConferenceId = nextApplications;
    },

    getApplicationsByConferenceId(id) {
      const key = String(id);
      const fromStore = this.applicationsByConferenceId[key];
      if (Array.isArray(fromStore)) return fromStore;

      const conference = this.getConferenceById(id);
      return applicationService.extractEmbeddedConferenceApplications(
        conference,
      );
    },

    async loadApplicationsForConference(id) {
      if (!isApiConfigured() || !id) {
        return this.getApplicationsByConferenceId(id);
      }

      const key = String(id);
      const authStore = useAuthStore();
      this.hydrateEmbeddedApplications();
      this.hydrateProfileApplications(authStore.user);

      const cachedApplications = this.getApplicationsByConferenceId(id);
      if (cachedApplications.length > 0) {
        return cachedApplications;
      }

      try {
        const loadedConference = await this.loadConference(id);
        const applications =
          applicationService.extractEmbeddedConferenceApplications(
            loadedConference,
          );
        this.applicationsByConferenceId = {
          ...this.applicationsByConferenceId,
          [key]: applications,
        };
        return applications;
      } catch (error) {
        const fallbackApplications = this.getApplicationsByConferenceId(id);
        this.applicationsByConferenceId = {
          ...this.applicationsByConferenceId,
          [key]: fallbackApplications,
        };
        if (![403, 404, 405].includes(Number(error?.status || 0))) {
          console.error("loadApplicationsForConference error:", error);
        }
        return fallbackApplications;
      }
    },

    async loadConference(id) {
      if (!id) return null;

      if (!isApiConfigured()) {
        return this.getConferenceById(id) || null;
      }

      const response = await apiRequestJSON(
        `/conferences/${encodeURIComponent(id)}`,
        { method: "GET" },
      );
      const normalizedConference = normalizeConferenceRecord(
        response?.data || response?.conference || response,
      );
      const exists = this.conferences.some(
        (conference) => String(conference.id) === String(id),
      );

      this.conferences = exists
        ? this.conferences.map((conference) =>
            String(conference.id) === String(id)
              ? normalizedConference
              : conference,
          )
        : [...this.conferences, normalizedConference];
      this.hydrateEmbeddedApplications();
      return normalizedConference;
    },

    async loadApplicationsForConferences(ids = []) {
      if (!isApiConfigured()) {
        this.hydrateEmbeddedApplications();
        return this.applicationsByConferenceId;
      }

      this.isLoadingApplications = true;
      try {
        this.hydrateEmbeddedApplications();
        this.hydrateProfileApplications(useAuthStore().user);
        return this.applicationsByConferenceId;
      } finally {
        this.isLoadingApplications = false;
      }
    },

    async deleteConference(id) {
      if (isApiConfigured()) {
        await apiRequestJSON(`/conferences/${id}`, { method: "DELETE" });
        this.conferences = this.conferences.filter((conf) => conf.id !== id);
        return true;
      }

      this.conferences = this.conferences.filter((conf) => conf.id !== id);
      storageService.setJSON("conferences", this.conferences);
      return true;
    },

    async updateConference(id, updatedConference) {
      if (isApiConfigured()) {
        const response = await apiRequestJSON(`/conferences/${id}`, {
          method: "PATCH",
          body: toConferencePayload(updatedConference),
        });
        const normalizedConference = normalizeConferenceRecord(
          response?.data || response?.conference || response,
        );
        this.conferences = this.conferences.map((conf) =>
          String(conf.id) === String(id) ? normalizedConference : conf,
        );
        return normalizedConference;
      }

      const index = this.conferences.findIndex((conf) => conf.id === id);
      if (index !== -1) {
        this.conferences[index] = {
          ...this.conferences[index],
          ...updatedConference,
        };
        storageService.setJSON("conferences", this.conferences);
        return this.conferences[index];
      }

      return null;
    },

    async bookConference(id, booking) {
      if (isApiConfigured()) {
        const response = await apiRequestJSON(`/conferences/${id}/book`, {
          method: "POST",
          body: booking,
        });
        await this.loadConferences();
        return response?.data || response;
      }

      const index = this.conferences.findIndex((conf) => conf.id === id);
      if (index === -1) return null;

      const conference = this.conferences[index];
      if (!isConferenceInFuture(conference)) {
        return null;
      }

      const bookings = Array.isArray(conference.bookings)
        ? [...conference.bookings]
        : [];
      const email = booking?.email?.trim();
      if (!email) return null;

      if (bookings.some((item) => item.email === email)) {
        return null;
      }

      const newBooking = {
        id: Date.now() + Math.random(),
        email,
        name: booking?.name || email,
        bookedAt: new Date().toISOString(),
        confirmationSentAt: null,
        reminderSentAt: null,
      };

      bookings.push(newBooking);
      this.conferences[index] = {
        ...conference,
        bookings,
      };
      storageService.setJSON("conferences", this.conferences);
      return newBooking;
    },

    async cancelBooking(id, email) {
      if (isApiConfigured()) {
        const conference = this.getConferenceById(id);
        const booking = Array.isArray(conference?.bookings)
          ? conference.bookings.find((item) => item.email === email)
          : null;

        if (!booking?.id) return false;

        await apiRequestJSON(`/conferences/${id}/bookings/${booking.id}`, {
          method: "DELETE",
        });
        await this.loadConferences();
        return true;
      }

      const index = this.conferences.findIndex((conf) => conf.id === id);
      if (index === -1) return false;

      const conference = this.conferences[index];
      const bookings = Array.isArray(conference.bookings)
        ? conference.bookings.filter((item) => item.email !== email)
        : [];

      this.conferences[index] = {
        ...conference,
        bookings,
      };
      storageService.setJSON("conferences", this.conferences);
      return true;
    },

    isBooked(id, email) {
      const conference = this.getConferenceById(id);
      if (!conference || !email) return false;
      return Array.isArray(conference.bookings)
        ? conference.bookings.some((item) => item.email === email)
        : false;
    },

    getBookedConferences(email) {
      if (!email) return [];
      return this.conferences.filter((conference) =>
        Array.isArray(conference.bookings)
          ? conference.bookings.some((item) => item.email === email)
          : false,
      );
    },

    getDueReminderBookings(now = new Date()) {
      const result = [];
      const reminderWindow = 60 * 60 * 1000;

      this.conferences.forEach((conference) => {
        if (!conference?.date) return;

        const timePart = conference.time || "00:00";
        const conferenceDate = new Date(`${conference.date}T${timePart}:00`);
        if (Number.isNaN(conferenceDate.getTime())) return;

        const timeUntilStart = conferenceDate.getTime() - now.getTime();
        if (timeUntilStart <= 0 || timeUntilStart > reminderWindow) return;

        const bookings = Array.isArray(conference.bookings)
          ? conference.bookings
          : [];

        bookings.forEach((booking) => {
          if (booking.reminderSentAt) return;
          result.push({ conference, booking });
        });
      });

      return result;
    },

    markReminderSent(conferenceId, email) {
      const index = this.conferences.findIndex(
        (conf) => conf.id === conferenceId,
      );
      if (index === -1) return false;

      const conference = this.conferences[index];
      const bookings = Array.isArray(conference.bookings)
        ? conference.bookings.map((booking) =>
            booking.email === email
              ? { ...booking, reminderSentAt: new Date().toISOString() }
              : booking,
          )
        : [];

      this.conferences[index] = {
        ...conference,
        bookings,
      };
      storageService.setJSON("conferences", this.conferences);
      return true;
    },

    markConfirmationSent(conferenceId, email) {
      const index = this.conferences.findIndex(
        (conf) => conf.id === conferenceId,
      );
      if (index === -1) return false;

      const conference = this.conferences[index];
      const bookings = Array.isArray(conference.bookings)
        ? conference.bookings.map((booking) =>
            booking.email === email
              ? { ...booking, confirmationSentAt: new Date().toISOString() }
              : booking,
          )
        : [];

      this.conferences[index] = {
        ...conference,
        bookings,
      };
      storageService.setJSON("conferences", this.conferences);
      return true;
    },
  },
});
