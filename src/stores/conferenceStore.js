import { defineStore } from "pinia";
import * as storageService from "../services/storageService";
import { apiRequestJSON, isApiConfigured } from "../services/apiClient";
import {
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

export const useConferenceStore = defineStore("conference", {
  state: () => ({
    conferences: storageService
      .getJSON("conferences", [])
      .map(normalizeConferenceRecord),
    isLoading: false,
  }),

  actions: {
    async loadConferences() {
      if (!isApiConfigured()) {
        this.conferences = storageService
          .getJSON("conferences", [])
          .map(normalizeConferenceRecord);
        return this.conferences;
      }

      this.isLoading = true;
      try {
        const response = await apiRequestJSON("/api/conferences", {
          method: "GET",
        });
        const conferences = Array.isArray(response)
          ? response
          : response?.data || response?.conferences || [];
        this.conferences = conferences.map(normalizeConferenceRecord);
        return this.conferences;
      } finally {
        this.isLoading = false;
      }
    },

    async addConference(conference) {
      const payload = toConferencePayload(conference);

      if (isApiConfigured()) {
        const response = await apiRequestJSON("/api/conferences", {
          method: "POST",
          body: payload,
        });
        const createdConference = normalizeConferenceRecord(
          response?.data || response,
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
      return this.conferences.find((conf) => conf.id === id);
    },

    async deleteConference(id) {
      if (isApiConfigured()) {
        await apiRequestJSON(`/api/conferences/${id}`, { method: "DELETE" });
        this.conferences = this.conferences.filter((conf) => conf.id !== id);
        return true;
      }

      this.conferences = this.conferences.filter((conf) => conf.id !== id);
      storageService.setJSON("conferences", this.conferences);
      return true;
    },

    async updateConference(id, updatedConference) {
      if (isApiConfigured()) {
        const response = await apiRequestJSON(`/api/conferences/${id}`, {
          method: "PUT",
          body: toConferencePayload(updatedConference),
        });
        const normalizedConference = normalizeConferenceRecord(
          response?.data || response,
        );
        this.conferences = this.conferences.map((conf) =>
          conf.id === id ? normalizedConference : conf,
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
        const response = await apiRequestJSON(`/api/conferences/${id}/book`, {
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

        await apiRequestJSON(`/api/conferences/${id}/bookings/${booking.id}`, {
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
