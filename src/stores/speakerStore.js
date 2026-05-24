import { defineStore } from "pinia";
import * as storageService from "../services/storageService";
import { useConferenceStore } from "./conferenceStore";
import {
  apiRequestJSON,
  getStoredAuthToken,
  isApiConfigured,
} from "../services/apiClient";
import {
  normalizeSpeakerRecord,
  toSpeakerPayload,
} from "../services/apiSchema";

function buildSpeakerId(speaker) {
  const firstName = speaker?.firstName || "";
  const lastName = speaker?.lastName || "";
  const email = speaker?.email || "";
  return `${firstName}|${lastName}|${email}`.trim().toLowerCase();
}

function getConferenceSpeakers(conference) {
  const speakers = Array.isArray(conference?.speakers)
    ? conference.speakers.filter(Boolean)
    : [];

  if (speakers.length > 0) return speakers;
  return conference?.speaker ? [conference.speaker] : [];
}

export const useSpeakerStore = defineStore("speaker", {
  state: () => ({
    speakers: [],
    isLoading: false,
  }),

  actions: {
    async loadSpeakers() {
      if (isApiConfigured() && getStoredAuthToken()) {
        this.isLoading = true;
        try {
          const response = await apiRequestJSON("/speakers", {
            method: "GET",
          });
          const speakers = Array.isArray(response)
            ? response
            : response?.data || response?.speakers || [];
          this.speakers = speakers.map((speaker) =>
            normalizeSpeakerRecord(speaker),
          );
          return this.speakers;
        } catch (error) {
          console.error("loadSpeakers error:", error);
          this.speakers = [];
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
          if (!conference) return;

          getConferenceSpeakers(conference).forEach((speaker) => {
            if (!speaker.firstName || !speaker.lastName || !speaker.email)
              return;

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

    async updateSpeaker(
      oldSpeakerId,
      updatedSpeaker,
      requesterEmail = "",
      requesterIsAdmin = false,
    ) {
      if (isApiConfigured()) {
        const response = await apiRequestJSON(`/speakers/${oldSpeakerId}`, {
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

      const currentSpeaker = (await this.loadSpeakers()).find(
        (speaker) => speaker.id === oldSpeakerId,
      );

      if (
        currentSpeaker?.createdBy &&
        currentSpeaker.createdBy !== requesterEmail &&
        !requesterIsAdmin
      ) {
        return false;
      }

      const conferenceStore = useConferenceStore();
      const conferences = conferenceStore.getConferences();

      const updatedConferences = conferences.map((conference) => {
        const speakers = getConferenceSpeakers(conference);
        const hasTargetSpeaker = speakers.some(
          (speaker) => buildSpeakerId(speaker) === oldSpeakerId,
        );
        if (!conference || !hasTargetSpeaker) return conference;

        const updatedSpeakers = speakers.map((speaker) =>
          buildSpeakerId(speaker) === oldSpeakerId
            ? {
                ...speaker,
                ...updatedSpeaker,
              }
            : speaker,
        );
        const primarySpeaker = updatedSpeakers[0] || null;

        return {
          ...conference,
          speaker: primarySpeaker,
          speakers: updatedSpeakers,
        };
      });

      conferenceStore.conferences = updatedConferences;
      storageService.setJSON("conferences", updatedConferences);
      this.loadSpeakers();
      return true;
    },
  },
});
