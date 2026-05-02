<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { useConferenceStore } from "../stores/conferenceStore";
import { useAuthStore } from "../stores/authStore";
import { useFileStore } from "../stores/fileStore";
import { showToast } from "../services/notificationService";
import SelectDropdown from "../components/SelectDropdown.vue";
import {
  CONFERENCE_TOPICS,
  CONFERENCE_TOPICS_ARRAY,
} from "../constants/topics";

const conferenceStore = useConferenceStore();
const auth = useAuthStore();
const fileStore = useFileStore();

const conferences = computed(() => conferenceStore.getConferences());
const selectedConference = ref(null);
const isEditing = ref(false);
const filterTopic = ref("all");
const selectedEditFileNames = ref([]);
const editForm = ref(createEmptyEditForm());
const currentTime = ref(new Date());
let timerId = null;

const topics = CONFERENCE_TOPICS;
const filterOptions = [
  { value: "all", label: "Все темы" },
  ...CONFERENCE_TOPICS_ARRAY,
];
const availableFiles = computed(() => fileStore.files || []);

function getCurrentUserEmail() {
  return typeof auth.user === "string" ? auth.user : auth.user?.email || "";
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

function getConferenceBookingsCount(conference) {
  return Array.isArray(conference?.bookings) ? conference.bookings.length : 0;
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
  const baseList =
    filterTopic.value === "all"
      ? conferences.value
      : conferences.value.filter((conf) => conf?.topic === filterTopic.value);

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

onMounted(() => {
  if (auth.isAuthenticated) fileStore.loadFiles();
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
    speaker: {
      firstName: conference.speaker?.firstName || "",
      lastName: conference.speaker?.lastName || "",
      bio: conference.speaker?.bio || "",
      email: conference.speaker?.email || "",
      photo: conference.speaker?.photo || "",
    },
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

function bookConference(conference) {
  if (!auth.isAuthenticated) {
    showToast("Чтобы записаться, войдите в аккаунт");
    return;
  }

  if (!isConferenceInFuture(conference)) {
    showToast("Запись доступна только для будущих конференций");
    return;
  }

  const email = getCurrentUserEmail();
  const booking = conferenceStore.bookConference(conference.id, {
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

function cancelConferenceBooking(conference) {
  if (!auth.isAuthenticated) return;

  const email = getCurrentUserEmail();
  const removed = conferenceStore.cancelBooking(conference.id, email);
  if (!removed) {
    showToast("Не удалось отменить запись");
    return;
  }

  selectedConference.value = conferenceStore.getConferenceById(conference.id);
  showToast("Запись отменена");
}

function canDeleteConference(conference) {
  if (!auth.isAuthenticated) return false;
  const currentUserEmail =
    typeof auth.user === "string" ? auth.user : auth.user?.email;
  const creatorEmail =
    typeof conference?.createdBy === "string"
      ? conference.createdBy
      : conference?.createdBy?.email;
  return currentUserEmail === creatorEmail;
}

function canManageConference(conference) {
  return canDeleteConference(conference);
}

function deleteConference(id) {
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
    conferenceStore.deleteConference(id);
    selectedConference.value = null;
    isEditing.value = false;
    showToast("Конференция удалена");
  }
}

function toggleEditFileSelection(fileName) {
  if (selectedEditFileNames.value.includes(fileName)) {
    selectedEditFileNames.value = selectedEditFileNames.value.filter(
      (name) => name !== fileName,
    );
    return;
  }
  selectedEditFileNames.value = [...selectedEditFileNames.value, fileName];
}

function handleEditSpeakerPhotoUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    editForm.value.speaker.photo = reader.result;
  };
  reader.readAsDataURL(file);
}

function openConference(conference) {
  selectedConference.value = conference;
  isEditing.value = false;
  editForm.value = createEmptyEditForm(conference);
  selectedEditFileNames.value = Array.isArray(conference?.usedFiles)
    ? conference.usedFiles.map((file) => file.name)
    : [];
}

function closeModal() {
  selectedConference.value = null;
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
  selectedEditFileNames.value = Array.isArray(
    selectedConference.value.usedFiles,
  )
    ? selectedConference.value.usedFiles.map((file) => file.name)
    : [];
  isEditing.value = true;
}

function cancelEditing() {
  if (selectedConference.value) {
    editForm.value = createEmptyEditForm(selectedConference.value);
    selectedEditFileNames.value = Array.isArray(
      selectedConference.value.usedFiles,
    )
      ? selectedConference.value.usedFiles.map((file) => file.name)
      : [];
  }
  isEditing.value = false;
}

function saveConferenceChanges() {
  if (!selectedConference.value) return;

  const currentEditForm = editForm.value;
  if (
    !currentEditForm.name.trim() ||
    !currentEditForm.description.trim() ||
    !currentEditForm.date ||
    !currentEditForm.time ||
    !currentEditForm.speaker.firstName.trim() ||
    !currentEditForm.speaker.lastName.trim() ||
    !currentEditForm.speaker.email.trim()
  ) {
    showToast("Заполните все обязательные поля");
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(currentEditForm.speaker.email)) {
    showToast("Введите корректный email спикера");
    return;
  }

  const updatedConference = {
    ...selectedConference.value,
    ...currentEditForm,
    speaker: { ...currentEditForm.speaker },
    usedFiles: availableFiles.value
      .filter((file) => selectedEditFileNames.value.includes(file.name))
      .map((file) => ({ name: file.name, size: file.size, date: file.date })),
  };

  conferenceStore.updateConference(
    selectedConference.value.id,
    updatedConference,
  );
  selectedConference.value = conferenceStore.getConferenceById(
    selectedConference.value.id,
  );
  selectedConference.value = selectedConference.value || updatedConference;
  isEditing.value = false;
  showToast("Конференция обновлена");
}
</script>

<template>
  <div class="conferences-container">
    <div class="conferences-wrapper">
      <div class="header-section">
        <h1 class="title">Все конференции</h1>
        <p class="subtitle">Список всех созданных конференций</p>
      </div>

      <div class="card filter-card">
        <label class="filter-label">Фильтр по теме:</label>
        <SelectDropdown v-model="filterTopic" :options="filterOptions" />
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

          <div class="speaker-info">
            <div class="speaker-avatar">
              <img
                v-if="conf?.speaker?.photo"
                :src="conf.speaker.photo"
                :alt="conf?.speaker?.firstName || 'Спикер'"
                class="speaker-avatar-image"
              />
              <template v-else
                >{{ conf?.speaker?.firstName?.[0] || "?"
                }}{{ conf?.speaker?.lastName?.[0] || "?" }}</template
              >
            </div>
            <div class="speaker-details">
              <p class="speaker-name">
                {{ conf?.speaker?.firstName || "—" }}
                {{ conf?.speaker?.lastName || "" }}
              </p>
              <p class="speaker-email">{{ conf?.speaker?.email || "" }}</p>
            </div>
          </div>

          <div class="conference-actions">
            <template v-if="isConferenceInFuture(conf)">
              <button
                v-if="auth.isAuthenticated"
                class="conference-book-button"
                :class="{
                  'conference-book-button--booked': isConferenceBooked(conf),
                }"
                @click.stop="
                  isConferenceBooked(conf)
                    ? cancelConferenceBooking(conf)
                    : bookConference(conf)
                "
              >
                {{
                  isConferenceBooked(conf) ? "Отменить запись" : "Записаться"
                }}
              </button>
              <p v-else class="conference-book-hint">
                Войдите, чтобы записаться на конференцию
              </p>
            </template>
            <div v-else class="conference-book-spacer"></div>
            <span
              v-if="getConferenceBookingsCount(conf) > 0"
              class="conference-book-count"
            >
              {{ getConferenceBookingsCount(conf) }} участн.
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
              v-for="file in selectedConference.usedFiles"
              :key="file.name"
              class="file-chip"
            >
              <span class="file-chip-name">{{ file.name }}</span>
              <span v-if="file.size" class="file-chip-meta">{{
                formatFileSize(file.size)
              }}</span>
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

        <div class="modal-section">
          <h3 class="modal-subtitle">Запись</h3>
          <p
            class="modal-text"
            v-if="
              isConferenceInFuture(selectedConference) &&
              isConferenceBooked(selectedConference)
            "
          >
            Вы уже записаны на эту конференцию.
          </p>
          <p
            class="modal-text"
            v-else-if="
              isConferenceInFuture(selectedConference) && auth.isAuthenticated
            "
          >
            Запишитесь, чтобы получить напоминание за час до начала.
          </p>
          <p
            class="modal-text"
            v-else-if="isConferenceInFuture(selectedConference)"
          >
            Войдите, чтобы записаться и получать напоминания.
          </p>
          <p v-else class="modal-text">
            Запись на завершенные конференции недоступна.
          </p>
        </div>

        <div class="modal-section">
          <h3 class="modal-subtitle">Информация о спикере</h3>
          <div class="speaker-full-info">
            <div class="speaker-avatar-large">
              <img
                v-if="selectedConference.speaker.photo"
                :src="selectedConference.speaker.photo"
                :alt="selectedConference.speaker.firstName || 'Спикер'"
                class="speaker-avatar-image speaker-avatar-image--large"
              />
              <template v-else></template>
            </div>
            <div class="speaker-full-details">
              <p class="speaker-full-name">
                {{ selectedConference.speaker.firstName }}
                {{ selectedConference.speaker.lastName }}
              </p>
              <p class="speaker-full-email">
                {{ selectedConference.speaker.email }}
              </p>
              <p v-if="selectedConference.speaker.bio" class="speaker-full-bio">
                {{ selectedConference.speaker.bio }}
              </p>
            </div>
          </div>
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
              v-model="editForm.topic"
              :options="filterOptions.slice(1)"
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
            <label class="edit-label">Материалы конференции</label>
            <p class="edit-help">Выберите файлы из загруженных материалов</p>
            <div v-if="availableFiles.length > 0" class="edit-files-list">
              <label
                v-for="file in availableFiles"
                :key="file.name"
                class="edit-file-item"
              >
                <input
                  type="checkbox"
                  :value="file.name"
                  :checked="selectedEditFileNames.includes(file.name)"
                  @change="toggleEditFileSelection(file.name)"
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

          <div class="edit-field">
            <label class="edit-label">Имя спикера</label>
            <input
              v-model="editForm.speaker.firstName"
              class="edit-input"
              type="text"
            />
          </div>

          <div class="edit-field">
            <label class="edit-label">Фамилия спикера</label>
            <input
              v-model="editForm.speaker.lastName"
              class="edit-input"
              type="text"
            />
          </div>

          <div class="edit-field edit-field--full">
            <label class="edit-label">Email спикера</label>
            <input
              v-model="editForm.speaker.email"
              class="edit-input"
              type="email"
            />
          </div>

          <div class="edit-field edit-field--full">
            <label class="edit-label">Фото спикера</label>
            <div class="edit-photo-row">
              <div
                class="edit-photo-preview"
                :class="{
                  'edit-photo-preview--empty': !editForm.speaker.photo,
                }"
              >
                <img
                  v-if="editForm.speaker.photo"
                  :src="editForm.speaker.photo"
                  alt="Фото спикера"
                />
                <span v-else>Нет фото</span>
              </div>
              <input
                type="file"
                accept="image/*"
                class="edit-photo-input"
                @change="handleEditSpeakerPhotoUpload"
              />
            </div>
          </div>

          <div class="edit-field edit-field--full">
            <label class="edit-label">Биография спикера</label>
            <textarea
              v-model="editForm.speaker.bio"
              class="edit-textarea"
              rows="3"
            ></textarea>
          </div>
        </div>
      </div>

      <div class="modal-actions">
        <button
          v-if="
            !isEditing &&
            auth.isAuthenticated &&
            isConferenceInFuture(selectedConference)
          "
          @click.stop="
            isConferenceBooked(selectedConference)
              ? cancelConferenceBooking(selectedConference)
              : bookConference(selectedConference)
          "
          class="btn-book"
        >
          {{
            isConferenceBooked(selectedConference)
              ? "Отменить запись"
              : "Записаться на конференцию"
          }}
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
  background: linear-gradient(
    135deg,
    rgba(74, 105, 226, 0.08) 0%,
    rgba(255, 165, 0, 0.05) 100%
  );
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
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 30px;
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

.conference-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 10px 0 16px;
  flex-wrap: wrap;
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

.speaker-full-info {
  display: flex;
  gap: 16px;
  align-items: flex-start;
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
}

.speaker-full-name {
  font-family: "Poppins", sans-serif;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-color);
  margin: 0 0 4px 0;
}

.speaker-full-email {
  font-family: "Roboto", sans-serif;
  font-size: 0.9rem;
  color: var(--light-text-color);
  margin: 0 0 8px 0;
}

.speaker-full-bio {
  font-family: "Roboto", sans-serif;
  font-size: 0.9rem;
  color: var(--light-text-color);
  margin: 0;
  line-height: 1.5;
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
.btn-save {
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
.btn-save {
  background-color: var(--primary-color);
  color: white;
}

.btn-edit:hover,
.btn-save:hover {
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

.edit-photo-row {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.edit-photo-preview {
  width: 84px;
  height: 84px;
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

.edit-photo-preview--empty {
  padding: 8px;
  text-align: center;
}

.edit-photo-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.edit-photo-input {
  font-family: "Roboto", sans-serif;
  font-size: 0.9rem;
  color: var(--text-color);
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

  .modal-actions {
    flex-direction: column;
  }
}
</style>
