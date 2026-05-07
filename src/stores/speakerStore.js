import { defineStore } from "pinia";
import * as storageService from "../services/storageService";
import { useConferenceStore } from "./conferenceStore";
import { apiRequestJSON, isApiConfigured } from "../services/apiClient";
import {
  normalizeSpeakerRecord,
  normalizeSpeakerSummaryRecord,
  toSpeakerPayload,
} from "../services/apiSchema";

function buildSpeakerId(speaker) {
  const firstName = speaker?.firstName || "";
  const lastName = speaker?.lastName || "";
  const email = speaker?.email || "";
  return `${firstName}|${lastName}|${email}`.trim().toLowerCase();
}

export const useSpeakerStore = defineStore("speaker", {
  state: () => ({
    speakers: [],
    isLoading: false,
  }),

  actions: {
    async loadSpeakers() {
      if (isApiConfigured()) {
        this.isLoading = true;
        try {
          const response = await apiRequestJSON("/api/speakers", {
            method: "GET",
          });
          const speakers = Array.isArray(response)
            ? response
            : response?.data || response?.speakers || [];
          this.speakers = speakers.map((speaker) =>
            normalizeSpeakerRecord(speaker),
          );
          return this.speakers;
        } finally {
          this.isLoading = false;
        }
      }

      const conferenceStore = useConferenceStore();
      const conferences = conferenceStore.getConferences();
      const speakersMap = new Map();

      if (Array.isArray(conferences) && conferences.length > 0) {
        conferences.forEach((conference) => {
          if (!conference || !conference.speaker) return;

          const speaker = conference.speaker;
          if (!speaker.firstName || !speaker.lastName || !speaker.email) return;

          const speakerId = buildSpeakerId(speaker);

          if (!speakersMap.has(speakerId)) {
            speakersMap.set(speakerId, {
              id: speakerId,
              firstName: speaker.firstName,
              lastName: speaker.lastName,
              name: `${speaker.firstName} ${speaker.lastName}`,
              email: speaker.email,
              bio: speaker.bio || "Информация отсутствует",
              photo: speaker.photo || "",
              createdBy: speaker.createdBy || conference.createdBy || "",
              conferences: [],
            });
          }

          const speakerData = speakersMap.get(speakerId);
          if (!speakerData.createdBy) {
            speakerData.createdBy =
              speaker.createdBy || conference.createdBy || "";
          }
          if (!speakerData.bio && speaker.bio) {
            speakerData.bio = speaker.bio;
          }
          if (!speakerData.photo && speaker.photo) {
            speakerData.photo = speaker.photo;
          }

          speakerData.conferences.push({
            name: conference.name,
            date: conference.date,
            time: conference.time,
          });
        });
      }

      this.speakers = Array.from(speakersMap.values());
      return this.speakers;
    },

    getSpeakers() {
      return this.loadSpeakers();
    },

    getSpeakerById(id) {
      return this.speakers.find((speaker) => speaker.id === id);
    },

    getSpeakerOptions() {
      return this.loadSpeakers().map((speaker) => ({
        value: speaker.id,
        label: `${speaker.firstName} ${speaker.lastName} (${speaker.email})`,
      }));
    },

    async updateSpeaker(oldSpeakerId, updatedSpeaker, requesterEmail = "") {
      if (isApiConfigured()) {
        const response = await apiRequestJSON(`/api/speakers/${oldSpeakerId}`, {
          method: "PATCH",
          body: toSpeakerPayload(updatedSpeaker),
        });
        const normalizedSpeaker = normalizeSpeakerRecord(
          response?.data || response,
        );
        this.speakers = this.speakers.map((speaker) =>
          speaker.id === oldSpeakerId ? normalizedSpeaker : speaker,
        );

        const conferenceStore = useConferenceStore();
        await conferenceStore.loadConferences?.();
        return normalizedSpeaker;
      }

      const currentSpeaker = this.loadSpeakers().find(
        (speaker) => speaker.id === oldSpeakerId,
      );

      if (
        currentSpeaker?.createdBy &&
        currentSpeaker.createdBy !== requesterEmail
      ) {
        return false;
      }

      const conferenceStore = useConferenceStore();
      const conferences = conferenceStore.getConferences();

      const updatedConferences = conferences.map((conference) => {
        if (!conference || !conference.speaker) return conference;
        if (buildSpeakerId(conference.speaker) !== oldSpeakerId)
          return conference;

        return {
          ...conference,
          speaker: {
            ...conference.speaker,
            ...updatedSpeaker,
          },
        };
      });

      conferenceStore.conferences = updatedConferences;
      storageService.setJSON("conferences", updatedConferences);
      this.loadSpeakers();
      return true;
    },
  },
});
