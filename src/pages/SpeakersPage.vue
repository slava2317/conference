<template>
  <div class="container">
    <h1 class="text-center mb-4">Спикеры</h1>

    <div v-if="speakers.length === 0" class="empty-state">
      <p class="empty-text">
        Спикеры появятся здесь после создания конференций
      </p>
    </div>

    <div v-else class="speakers-grid">
      <div
        v-for="speaker in speakers"
        :key="speaker.id"
        class="card speaker-card"
        @click="openSpeakerModal(speaker)"
      >
        <img
          v-if="speaker.photo"
          :src="speaker.photo"
          :alt="speaker.name"
          class="speaker-photo speaker-photo-image"
        />
        <div
          v-else
          class="speaker-photo speaker-avatar-placeholder"
          aria-hidden="true"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5Z"
              fill="currentColor"
            />
            <path
              d="M4 20.25C4 16.798 7.581 14 12 14s8 2.798 8 6.25V22H4v-1.75Z"
              fill="currentColor"
            />
          </svg>
        </div>
        <h3>{{ speaker.name }}</h3>
        <p class="speaker-bio-preview">{{ speaker.bio }}</p>
      </div>
    </div>

    <div
      v-if="selectedSpeaker"
      class="modal-overlay"
      @click="closeSpeakerModal"
    >
      <div class="modal-content" @click.stop>
        <button class="modal-close" @click="closeSpeakerModal">&times;</button>
        <div v-if="!isEditingSpeaker">
          <img
            v-if="selectedSpeaker.photo"
            :src="selectedSpeaker.photo"
            :alt="selectedSpeaker.name"
            class="modal-photo speaker-photo-image"
          />
          <div
            v-else
            class="modal-photo speaker-avatar-placeholder"
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5Z"
                fill="currentColor"
              />
              <path
                d="M4 20.25C4 16.798 7.581 14 12 14s8 2.798 8 6.25V22H4v-1.75Z"
                fill="currentColor"
              />
            </svg>
          </div>
          <h2>{{ selectedSpeaker.name }}</h2>
          <p class="speaker-email">{{ selectedSpeaker.email }}</p>
          <p v-if="selectedSpeaker.bio" class="speaker-bio">
            {{ selectedSpeaker.bio }}
          </p>

          <div
            v-if="
              selectedSpeaker.conferences &&
              selectedSpeaker.conferences.length > 0
            "
            class="speaker-conferences"
          >
            <h3>Конференции</h3>
            <div class="conferences-list">
              <div
                v-for="(conf, idx) in selectedSpeaker.conferences"
                :key="idx"
                class="conference-item"
              >
                <h4>{{ conf.name }}</h4>
                <p>{{ conf.date }} в {{ conf.time }}</p>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="speaker-edit-form">
          <div class="speaker-edit-section">
            <h2>Редактирование спикера</h2>
            <p class="speaker-edit-hint">
              Можно изменить ФИО, email, фото и описание.
            </p>
          </div>

          <div class="speaker-edit-photo-row">
            <div
              class="speaker-edit-photo-preview"
              :class="{
                'speaker-edit-photo-preview--empty': !editSpeakerForm.photo,
              }"
            >
              <img
                v-if="editSpeakerForm.photo"
                :src="editSpeakerForm.photo"
                alt="Фото спикера"
              />
              <span v-else>Нет фото</span>
            </div>
            <input
              type="file"
              accept="image/*"
              class="speaker-edit-photo-input"
              @change="handleSpeakerEditPhotoUpload"
            />
          </div>

          <div class="speaker-edit-grid">
            <div class="speaker-edit-field">
              <label>Имя</label>
              <input
                v-model="editSpeakerForm.firstName"
                type="text"
                class="speaker-edit-input"
              />
            </div>

            <div class="speaker-edit-field">
              <label>Фамилия</label>
              <input
                v-model="editSpeakerForm.lastName"
                type="text"
                class="speaker-edit-input"
              />
            </div>

            <div class="speaker-edit-field speaker-edit-field--full">
              <label>Email</label>
              <input
                v-model="editSpeakerForm.email"
                type="email"
                class="speaker-edit-input"
              />
            </div>

            <div class="speaker-edit-field speaker-edit-field--full">
              <label>Биография</label>
              <textarea
                v-model="editSpeakerForm.bio"
                rows="3"
                class="speaker-edit-textarea"
              ></textarea>
            </div>
          </div>
        </div>

        <div class="speaker-modal-actions">
          <button
            v-if="isEditingSpeaker"
            class="speaker-action-button speaker-action-button--secondary"
            type="button"
            @click="cancelSpeakerEditing"
          >
            Отмена
          </button>
          <button
            v-if="isEditingSpeaker"
            class="speaker-action-button speaker-action-button--primary"
            type="button"
            @click="saveSpeakerChanges"
          >
            Сохранить
          </button>
          <button
            v-else-if="canEditSelectedSpeaker"
            class="speaker-action-button speaker-action-button--primary"
            type="button"
            @click="startSpeakerEditing"
          >
            Редактировать
          </button>
          <p v-else class="speaker-edit-hint speaker-edit-hint--readonly">
            Редактирование доступно только автору спикера.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from "vue";
import { useAuthStore } from "../stores/authStore";
import { useSpeakerStore } from "../stores/speakerStore";
import { showToast } from "../services/notificationService";
import {
  readFileAsDataURL,
  validateSpeakerPhotoFile,
} from "../services/speakerPhotoService";

const auth = useAuthStore();
const speakerStore = useSpeakerStore();
const selectedSpeaker = ref(null);
const speakers = computed(() => speakerStore.speakers);
const selectedSpeakerOriginalId = ref("");
const isEditingSpeaker = ref(false);
const editSpeakerForm = ref(createEmptySpeakerForm());
const currentUserEmail = computed(() => {
  if (typeof auth.user === "string") return auth.user;
  return auth.user?.email || "";
});
const canEditSelectedSpeaker = computed(() => {
  return (
    !!selectedSpeaker.value &&
    !!selectedSpeaker.value.createdBy &&
    selectedSpeaker.value.createdBy === currentUserEmail.value
  );
});

function buildSpeakerId(speaker) {
  return `${speaker?.firstName || ""}|${speaker?.lastName || ""}|${speaker?.email || ""}`
    .trim()
    .toLowerCase();
}

function createEmptySpeakerForm(speaker = {}) {
  return {
    firstName: speaker.firstName || "",
    lastName: speaker.lastName || "",
    email: speaker.email || "",
    bio: speaker.bio || "",
    photo: speaker.photo || "",
  };
}

async function handleSpeakerEditPhotoUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const photoError = validateSpeakerPhotoFile(file);
  if (photoError) {
    showToast(photoError);
    event.target.value = "";
    return;
  }

  try {
    editSpeakerForm.value.photo = await readFileAsDataURL(file);
  } catch (error) {
    console.error(error);
    showToast("Не удалось загрузить фото спикера");
    event.target.value = "";
  }
}

function loadSpeakers() {
  try {
    speakerStore.loadSpeakers();
  } catch (error) {
    console.error("Ошибка при загрузке спикеров:", error);
    speakerStore.speakers = [];
  }
}

onMounted(() => {
  loadSpeakers();
});

function openSpeakerModal(speaker) {
  selectedSpeaker.value = speaker;
  selectedSpeakerOriginalId.value = speaker.id;
  editSpeakerForm.value = createEmptySpeakerForm(speaker);
  isEditingSpeaker.value = false;
}

function closeSpeakerModal() {
  selectedSpeaker.value = null;
  selectedSpeakerOriginalId.value = "";
  isEditingSpeaker.value = false;
}

function startSpeakerEditing() {
  if (!selectedSpeaker.value) return;
  if (!canEditSelectedSpeaker.value) return;
  editSpeakerForm.value = createEmptySpeakerForm(selectedSpeaker.value);
  isEditingSpeaker.value = true;
}

function cancelSpeakerEditing() {
  if (selectedSpeaker.value) {
    editSpeakerForm.value = createEmptySpeakerForm(selectedSpeaker.value);
  }
  isEditingSpeaker.value = false;
}

function saveSpeakerChanges() {
  if (!selectedSpeaker.value) return;

  if (!canEditSelectedSpeaker.value) {
    return;
  }

  if (
    !editSpeakerForm.value.firstName.trim() ||
    !editSpeakerForm.value.lastName.trim() ||
    !editSpeakerForm.value.email.trim()
  ) {
    alert("Заполните все обязательные поля");
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(editSpeakerForm.value.email)) {
    alert("Введите корректный email спикера");
    return;
  }

  const updated = speakerStore.updateSpeaker(
    selectedSpeakerOriginalId.value,
    {
      firstName: editSpeakerForm.value.firstName.trim(),
      lastName: editSpeakerForm.value.lastName.trim(),
      email: editSpeakerForm.value.email.trim(),
      bio: editSpeakerForm.value.bio.trim(),
      photo: editSpeakerForm.value.photo,
    },
    currentUserEmail.value,
  );

  if (!updated) {
    return;
  }

  speakerStore.loadSpeakers();
  const updatedSpeakerId = buildSpeakerId(editSpeakerForm.value);
  selectedSpeaker.value = speakerStore.getSpeakerById(updatedSpeakerId) || {
    ...editSpeakerForm.value,
    id: updatedSpeakerId,
    conferences: selectedSpeaker.value.conferences || [],
  };
  selectedSpeakerOriginalId.value = updatedSpeakerId;
  isEditingSpeaker.value = false;
}
</script>

<style scoped>
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 15px;
}

.text-center {
  text-align: center;
}

.mb-4 {
  margin-bottom: 2rem;
}

.speakers-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(180px, 1fr));
  gap: 48px;
  width: 100%;
  max-width: 700px;
  margin: 0 auto;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-text {
  font-family: "Roboto", sans-serif;
  font-size: 1.1rem;
  color: var(--light-text-color);
  margin: 0;
}

.card {
  background-color: var(--card-background-color) !important;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 25px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  border: 1px solid var(--border-color);
  visibility: visible !important;
  opacity: 1 !important;
  display: block !important;
  width: 100% !important;
}

.speaker-card {
  cursor: pointer;
  text-align: center;
  display: flex !important;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  aspect-ratio: 1 / 1;
  visibility: visible !important;
  opacity: 1 !important;
  position: relative;
  z-index: 1;
  padding: 12px !important;
}

.speaker-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);
  border-color: var(--primary-color);
}

.speaker-card h3 {
  font-family: "Poppins", sans-serif;
  font-weight: 600;
  color: var(--text-color);
  margin: 0.5rem 0 0.3rem 0;
  font-size: 0.9rem;
  visibility: visible !important;
  word-break: break-word;
}

.speaker-photo {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  object-fit: cover;
  margin: 1rem auto 0.3rem auto;
  border: 3px solid var(--primary-color);
  display: block !important;
  background-color: rgba(74, 105, 226, 0.1);
  visibility: visible !important;
  flex-shrink: 0;
}

.speaker-photo-image {
  object-fit: cover;
}

.speaker-avatar-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  overflow: hidden;
}

.speaker-avatar-placeholder svg {
  width: 62%;
  height: 62%;
  transform: translateY(8px);
}

.speaker-company {
  color: var(--light-text-color);
  font-size: 0.9rem;
  margin: 0;
  visibility: visible !important;
}

.speaker-bio-preview {
  color: var(--light-text-color);
  font-size: 0.65rem;
  margin: 0.3rem 0 0 0;
  visibility: visible !important;
  line-height: 1.2;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Modal styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
}
.modal-content {
  background: var(--card-background-color);
  padding: 40px;
  border-radius: 12px;
  max-width: 600px;
  width: 90%;
  position: relative;
  text-align: center;
}
.modal-close {
  position: absolute;
  top: 15px;
  right: 15px;
  background: none;
  border: none;
  font-size: 2rem;
  cursor: pointer;
  color: var(--text-color);
}
.modal-photo {
  width: 200px;
  height: 200px;
  border-radius: 50%;
  object-fit: cover;
  margin-bottom: 1rem;
}

.modal-photo.speaker-avatar-placeholder {
  margin: 0 auto 1rem auto;
  background: #eef2f7;
  color: #a3acb9;
}

.modal-photo.speaker-avatar-placeholder svg {
  width: 58%;
  height: 58%;
  transform: translateY(8px);
}

.modal-content h2 {
  font-family: "Poppins", sans-serif;
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--text-color);
  margin: 1rem 0 0.5rem 0;
}
.speaker-socials {
  margin-top: 1.5rem;
  display: flex;
  justify-content: center;
  gap: 20px;
}
.speaker-socials a {
  color: var(--primary-color);
  text-decoration: none;
  font-weight: 500;
}

.speaker-email {
  color: var(--light-text-color);
  font-size: 0.9rem;
  margin: 0.5rem 0;
  font-family: "Roboto", sans-serif;
}

.speaker-bio {
  color: var(--text-color);
  margin: 1rem 0;
  line-height: 1.6;
  font-family: "Roboto", sans-serif;
  text-align: left;
}

.speaker-conferences {
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid var(--border-color);
}

.speaker-conferences h3 {
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--text-color);
  text-align: left;
  margin-bottom: 1rem;
  font-family: "Poppins", sans-serif;
}

.conferences-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.conference-item {
  background-color: rgba(74, 105, 226, 0.08);
  padding: 12px;
  border-radius: 8px;
  text-align: left;
  border-left: 3px solid var(--primary-color);
}

.conference-item h4 {
  margin: 0 0 8px 0;
  color: var(--text-color);
  font-family: "Poppins", sans-serif;
  font-size: 0.95rem;
}

.conference-item p {
  margin: 0;
  color: var(--light-text-color);
  font-size: 0.85rem;
  font-family: "Roboto", sans-serif;
}

.speaker-edit-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.speaker-edit-section h2 {
  font-family: "Poppins", sans-serif;
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--text-color);
  margin: 0 0 8px 0;
}

.speaker-edit-hint {
  margin: 0;
  color: var(--light-text-color);
  font-family: "Roboto", sans-serif;
  font-size: 0.9rem;
}

.speaker-edit-photo-row {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.speaker-edit-photo-preview {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid var(--border-color);
  background-color: rgba(74, 105, 226, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--light-text-color);
  font-family: "Roboto", sans-serif;
  font-size: 0.8rem;
  flex-shrink: 0;
}

.speaker-edit-photo-preview--empty {
  padding: 8px;
  text-align: center;
}

.speaker-edit-photo-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.speaker-edit-photo-input {
  font-family: "Roboto", sans-serif;
  font-size: 0.9rem;
  color: var(--text-color);
}

.speaker-edit-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.speaker-edit-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.speaker-edit-field--full {
  grid-column: 1 / -1;
}

.speaker-edit-field label {
  font-family: "Roboto", sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-color);
}

.speaker-edit-input,
.speaker-edit-textarea {
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

.speaker-edit-input:focus,
.speaker-edit-textarea:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(74, 105, 226, 0.1);
}

.speaker-edit-textarea {
  resize: vertical;
  min-height: 100px;
}

.speaker-modal-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid var(--border-color);
}

.speaker-action-button {
  flex: 1;
  padding: 12px 14px;
  border: none;
  border-radius: 10px;
  font-family: "Poppins", sans-serif;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.speaker-action-button--primary {
  background-color: var(--primary-color);
  color: white;
}

.speaker-action-button--primary:hover {
  background-color: var(--secondary-color);
}

.speaker-action-button--secondary {
  background-color: var(--border-color);
  color: var(--text-color);
}

.speaker-action-button--secondary:hover {
  opacity: 0.85;
}

@media (max-width: 640px) {
  .speaker-edit-grid {
    grid-template-columns: 1fr;
  }

  .speaker-modal-actions {
    flex-direction: column;
  }
}
</style>
