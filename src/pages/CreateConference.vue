<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/authStore";
import { useConferenceStore } from "../stores/conferenceStore";
import { useFileStore } from "../stores/fileStore";
import { useSpeakerStore } from "../stores/speakerStore";
import { showToast } from "../services/notificationService";
import {
  readFileAsDataURL,
  validateSpeakerPhotoFile,
} from "../services/speakerPhotoService";
import SelectDropdown from "../components/SelectDropdown.vue";
import { CONFERENCE_TOPICS_ARRAY } from "../constants/topics";

const auth = useAuthStore();
const router = useRouter();
const conferenceStore = useConferenceStore();
const fileStore = useFileStore();
const speakerStore = useSpeakerStore();
const selectedFileNames = ref([]);
const selectedSpeakerId = ref("new");

// Проверка авторизации при загрузке
if (!auth.isAuthenticated) {
  showToast("Пожалуйста, авторизуйтесь");
  router.push("/login");
}

onMounted(() => {
  if (auth.isAuthenticated) {
    fileStore.loadFiles();
  }
  speakerStore.loadSpeakers();
});

const availableFiles = computed(() => fileStore.files);
const speakerOptions = computed(() => [
  { value: "new", label: "Новый спикер" },
  ...speakerStore.speakers.map((speaker) => ({
    value: speaker.id,
    label: `${speaker.firstName} ${speaker.lastName}`,
    searchText: `${speaker.firstName} ${speaker.lastName} ${speaker.email}`,
  })),
]);

// Форма конференции
const formData = ref({
  name: "",
  description: "",
  topic: "technology",
  date: "",
  time: "",
  speaker: {
    firstName: "",
    lastName: "",
    bio: "",
    email: "",
    photo: "",
  },
});

async function handleSpeakerPhotoUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const photoError = validateSpeakerPhotoFile(file);
  if (photoError) {
    showToast(photoError);
    event.target.value = "";
    return;
  }

  try {
    formData.value.speaker.photo = await readFileAsDataURL(file);
  } catch (error) {
    console.error(error);
    showToast("Не удалось загрузить фото спикера");
    event.target.value = "";
  }
}

function applySelectedSpeaker(speakerId) {
  if (speakerId === "new") {
    formData.value.speaker = {
      firstName: "",
      lastName: "",
      bio: "",
      email: "",
      photo: "",
    };
    return;
  }

  const selectedSpeaker = speakerStore.getSpeakerById(speakerId);
  if (!selectedSpeaker) return;

  formData.value.speaker = {
    firstName: selectedSpeaker.firstName,
    lastName: selectedSpeaker.lastName,
    bio: selectedSpeaker.bio || "",
    email: selectedSpeaker.email,
    photo: selectedSpeaker.photo || "",
  };
}

watch(
  selectedSpeakerId,
  (speakerId) => {
    applySelectedSpeaker(speakerId);
  },
  { immediate: true },
);

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const topics = CONFERENCE_TOPICS_ARRAY;

function isFormValid() {
  return (
    formData.value.name.trim() &&
    formData.value.description.trim() &&
    formData.value.date &&
    formData.value.time &&
    formData.value.speaker.firstName.trim() &&
    formData.value.speaker.lastName.trim() &&
    formData.value.speaker.email.trim()
  );
}

function toggleFileSelection(fileName) {
  if (selectedFileNames.value.includes(fileName)) {
    selectedFileNames.value = selectedFileNames.value.filter(
      (name) => name !== fileName,
    );
    return;
  }

  selectedFileNames.value = [...selectedFileNames.value, fileName];
}

async function submitConference() {
  if (!isFormValid()) {
    showToast("Заполните все обязательные поля");
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(formData.value.speaker.email)) {
    showToast("Введите корректный email спикера");
    return;
  }

  try {
    const currentUserEmail =
      typeof auth.user === "string" ? auth.user : auth.user?.email || "";
    const currentUserIdentifier =
      typeof auth.user === "string"
        ? auth.user
        : auth.user?.id || auth.user?.participantId || auth.user?.email || "";

    const selectedFiles = fileStore.files.filter((file) =>
      selectedFileNames.value.includes(file.name),
    );
    const missingContentFile = selectedFiles.find(
      (file) => !file.contentId && !file.content,
    );
    if (missingContentFile) {
      showToast(
        `Файл «${missingContentFile.name}» был загружен раньше и не содержит данных для скачивания. Перезагрузите его в разделе «Материалы».`,
      );
      return;
    }

    const createdConference = await conferenceStore.addConference({
      name: formData.value.name,
      description: formData.value.description,
      topic: formData.value.topic,
      date: formData.value.date,
      time: formData.value.time,
      speaker: {
        ...formData.value.speaker,
        createdBy: currentUserEmail,
      },
      usedFiles: selectedFiles.map((file) => ({
        name: file.name,
        size: file.size,
        type: file.type,
        date: file.date,
        contentId: file.contentId,
        sourceUserEmail: currentUserEmail,
      })),
      createdBy: currentUserIdentifier,
    });

    if (!createdConference) {
      showToast("Не удалось создать конференцию: хранилище переполнено");
      return;
    }

    showToast("Конференция успешно создана!");
    router.push("/");
  } catch (error) {
    showToast("Ошибка при создании конференции");
    console.error(error);
  }
}
</script>

<template>
  <div class="conference-container">
    <div class="conference-wrapper">
      <!-- Заголовок -->
      <div class="header-section">
        <h1 class="page-title">Создать конференцию</h1>
        <p class="page-lead">Заполните информацию о новой конференции</p>
      </div>

      <!-- Форма конференции -->
      <div class="card">
        <h2 class="section-title">Информация о конференции</h2>

        <form @submit.prevent="submitConference" class="form">
          <!-- Название конференции -->
          <div class="form-group">
            <label class="form-label">Название конференции</label>
            <input
              v-model="formData.name"
              type="text"
              placeholder="Введите название конференции"
              class="form-input"
            />
          </div>

          <!-- Тема конференции -->
          <div class="form-group">
            <label class="form-label">Тема конференции</label>
            <SelectDropdown v-model="formData.topic" :options="topics" />
          </div>

          <!-- Описание -->
          <div class="form-group">
            <label class="form-label">Описание</label>
            <textarea
              v-model="formData.description"
              placeholder="Введите подробное описание конференции"
              class="form-textarea"
              rows="4"
            ></textarea>
          </div>

          <!-- Материалы конференции -->
          <div class="form-group">
            <label class="form-label">Материалы конференции</label>
            <p class="form-help">
              Файлы загружаются на странице «Материалы», здесь их можно
              привязать к этой конференции.
            </p>

            <div v-if="availableFiles.length > 0" class="files-select-list">
              <label
                v-for="file in availableFiles"
                :key="file.name"
                class="file-select-item"
              >
                <input
                  type="checkbox"
                  :value="file.name"
                  :checked="selectedFileNames.includes(file.name)"
                  @change="toggleFileSelection(file.name)"
                />
                <span class="file-select-name">{{ file.name }}</span>
                <span class="file-select-meta">{{
                  formatFileSize(file.size)
                }}</span>
              </label>
            </div>

            <p v-else class="form-help">
              У вас пока нет загруженных файлов. Перейдите в «Материалы» и
              добавьте их туда.
            </p>
          </div>

          <!-- Дата и время -->
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Дата начала</label>
              <input v-model="formData.date" type="date" class="form-input" />
            </div>
            <div class="form-group">
              <label class="form-label">Время начала</label>
              <input v-model="formData.time" type="time" class="form-input" />
            </div>
          </div>
        </form>
      </div>

      <!-- Информация о спикере -->
      <div class="card">
        <h2 class="section-title">Информация о спикере</h2>

        <div class="form">
          <!-- Выбор спикера -->
          <div class="form-group">
            <label class="form-label">Спикер</label>
            <SelectDropdown
              v-model="selectedSpeakerId"
              :options="speakerOptions"
              label="Выберите спикера"
              searchable
            />
            <p class="form-help">
              Можно выбрать уже созданного спикера или оставить "Новый спикер".
            </p>
          </div>

          <!-- Имя спикера -->
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Имя</label>
              <input
                v-model="formData.speaker.firstName"
                type="text"
                placeholder="Введите имя спикера"
                class="form-input"
              />
            </div>
            <div class="form-group">
              <label class="form-label">Фамилия</label>
              <input
                v-model="formData.speaker.lastName"
                type="text"
                placeholder="Введите фамилию спикера"
                class="form-input"
              />
            </div>
          </div>

          <!-- Email спикера -->
          <div class="form-group">
            <label class="form-label">Email спикера</label>
            <input
              v-model="formData.speaker.email"
              type="email"
              placeholder="speaker@example.com"
              class="form-input"
            />
          </div>

          <!-- Фото спикера -->
          <div class="form-group">
            <label class="form-label">Фото спикера</label>
            <div class="photo-upload">
              <div
                class="photo-preview"
                :class="{ 'photo-preview--empty': !formData.speaker.photo }"
              >
                <img
                  v-if="formData.speaker.photo"
                  :src="formData.speaker.photo"
                  alt="Фото спикера"
                />
                <span v-else>Нет фото</span>
              </div>
              <input
                type="file"
                accept="image/*"
                class="photo-input"
                @change="handleSpeakerPhotoUpload"
              />
            </div>
          </div>

          <!-- Биография спикера -->
          <div class="form-group">
            <label class="form-label">Биография спикера</label>
            <textarea
              v-model="formData.speaker.bio"
              placeholder="Расскажите о спикере (опционально)"
              class="form-textarea"
              rows="3"
            ></textarea>
          </div>
        </div>
      </div>

      <!-- Кнопки действия -->
      <div class="action-buttons">
        <button @click="submitConference" class="btn-submit">
          Создать конференцию
        </button>
        <button @click="() => router.push('/')" class="btn-cancel">
          Отмена
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.conference-container {
  min-height: calc(100vh - 140px);
  background-color: var(--background-color);
  padding: 40px 15px;
}

.conference-wrapper {
  max-width: 800px;
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
  padding: 30px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid var(--border-color);
  margin-bottom: 24px;
}

.section-title {
  font-family: "Poppins", sans-serif;
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--text-color);
  margin: 0 0 24px 0;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-label {
  font-family: "Roboto", sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-color);
  text-transform: none;
}

.form-input,
.form-textarea {
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

.form-input::placeholder,
.form-textarea::placeholder {
  color: var(--light-text-color);
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(74, 105, 226, 0.1);
}

.form-textarea {
  resize: vertical;
  min-height: 100px;
}

.form-help {
  font-family: "Roboto", sans-serif;
  font-size: 0.85rem;
  color: var(--light-text-color);
  margin: 0;
}

.files-select-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.file-select-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: rgba(74, 105, 226, 0.04);
  cursor: pointer;
}

.file-select-item input {
  margin: 0;
}

.file-select-name {
  font-family: "Roboto", sans-serif;
  color: var(--text-color);
  word-break: break-word;
}

.file-select-meta {
  font-family: "Roboto", sans-serif;
  color: var(--light-text-color);
  font-size: 0.8rem;
  white-space: nowrap;
}

.photo-upload {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.photo-preview {
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

.photo-preview--empty {
  padding: 8px;
  text-align: center;
}

.photo-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-input {
  font-family: "Roboto", sans-serif;
  font-size: 0.9rem;
  color: var(--text-color);
  width: 100%;
  max-width: 320px;
  background: transparent;
  border: none;
  padding: 0;
}

.photo-input::file-selector-button,
.photo-input::-webkit-file-upload-button {
  margin-right: 12px;
  padding: 10px 16px;
  border: 1px solid rgba(74, 105, 226, 0.35);
  border-radius: 999px;
  background: linear-gradient(
    135deg,
    rgba(74, 105, 226, 0.16),
    rgba(74, 105, 226, 0.08)
  );
  color: var(--text-color);
  font-family: "Poppins", sans-serif;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    background 0.2s ease;
}

.photo-input::file-selector-button:hover,
.photo-input::-webkit-file-upload-button:hover {
  transform: translateY(-1px);
  background: linear-gradient(
    135deg,
    rgba(74, 105, 226, 0.22),
    rgba(74, 105, 226, 0.12)
  );
  box-shadow: 0 6px 16px rgba(74, 105, 226, 0.18);
}

:global(html[data-theme="dark"]) .photo-input::file-selector-button,
:global(html[data-theme="dark"]) .photo-input::-webkit-file-upload-button {
  border-color: rgba(234, 234, 234, 0.2);
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.08),
    rgba(255, 255, 255, 0.04)
  );
  color: var(--text-color);
}

:global(html[data-theme="dark"]) .photo-input::file-selector-button:hover,
:global(html[data-theme="dark"])
  .photo-input::-webkit-file-upload-button:hover {
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.13),
    rgba(255, 255, 255, 0.07)
  );
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
}

.action-buttons {
  display: flex;
  gap: 12px;
  margin-top: 40px;
}

.btn-submit,
.btn-cancel {
  flex: 1;
  padding: 14px;
  border: none;
  border-radius: 10px;
  font-family: "Poppins", sans-serif;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-submit {
  background-color: var(--primary-color);
  color: white;
}

.btn-submit:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(74, 105, 226, 0.4);
}

.btn-cancel {
  background-color: var(--border-color);
  color: var(--text-color);
}

.btn-cancel:hover {
  opacity: 0.8;
}

@media (max-width: 600px) {
  .form-row {
    grid-template-columns: 1fr;
  }

  .title {
    font-size: 1.8rem;
  }

  .action-buttons {
    flex-direction: column;
  }
}
</style>
