<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/authStore";
import { useConferenceStore } from "../stores/conferenceStore";
import { useFileStore } from "../stores/fileStore";
import { showToast } from "../services/notificationService";
import SelectDropdown from "../components/SelectDropdown.vue";
import { CONFERENCE_TOPICS_ARRAY } from "../constants/topics";
import { getApiErrorMessage } from "../services/apiErrorService";
import { getApplicationDictionaries } from "../services/applicationDictionaryService";

const auth = useAuthStore();
const router = useRouter();
const conferenceStore = useConferenceStore();
const fileStore = useFileStore();
const selectedFileIds = ref([]);
const sections = ref([]);
const sectionsByTopic = ref({});
const isLoadingSections = ref(false);
const sectionsError = ref("");

// Проверка авторизации при загрузке
if (!auth.isAuthenticated) {
  showToast("Пожалуйста, авторизуйтесь");
  router.push("/login");
}

onMounted(() => {
  if (auth.isAuthenticated) {
    fileStore.loadFiles();
    loadSections();
  }
});

const availableFiles = computed(() => fileStore.files);

// Форма конференции
const formData = ref({
  name: "",
  description: "",
  topic: "technology",
  date: "",
  time: "",
  sectionIds: [],
});

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileSelectionId(file) {
  return String(file?.id || file?.contentId || file?.file_id || "");
}

function getFileKey(file, index) {
  return getFileSelectionId(file) || `${file?.name || "file"}-${index}`;
}

const topics = CONFERENCE_TOPICS_ARRAY;
const availableSections = computed(() =>
  getSectionsForTopic(formData.value.topic),
);

watch(
  () => formData.value.topic,
  () => {
    formData.value.sectionIds = [];
  },
);

function isFormValid() {
  return Boolean(
    formData.value.name.trim() &&
      formData.value.description.trim() &&
      formData.value.date &&
      formData.value.time &&
      formData.value.sectionIds.length > 0,
  );
}

async function loadSections() {
  isLoadingSections.value = true;
  sectionsError.value = "";

  try {
    const dictionary = await getApplicationDictionaries();
    sections.value = dictionary.sections || [];
    sectionsByTopic.value = dictionary.sectionsByTopic || {};
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
  const topicKey = String(topic || "").trim();

  if (
    topicKey &&
    Object.prototype.hasOwnProperty.call(sectionsByTopic.value, topicKey)
  ) {
    return sectionsByTopic.value[topicKey] || [];
  }

  return sections.value;
}

function hasSectionValidationError(error) {
  const errors = error?.errors || error?.payload?.errors || {};
  return Object.keys(errors).some((field) =>
    String(field).toLowerCase().includes("section"),
  );
}

function isConferenceDateInFuture() {
  if (!formData.value.date || !formData.value.time) {
    return false;
  }

  const conferenceDate = new Date(
    `${formData.value.date}T${formData.value.time}:00`,
  );

  if (Number.isNaN(conferenceDate.getTime())) {
    return false;
  }

  return conferenceDate.getTime() > Date.now();
}

function toggleFileSelection(file) {
  const fileId = getFileSelectionId(file);
  if (!fileId) return;

  if (selectedFileIds.value.includes(fileId)) {
    selectedFileIds.value = selectedFileIds.value.filter((id) => id !== fileId);
    return;
  }

  selectedFileIds.value = [...selectedFileIds.value, fileId];
}

function toggleSectionSelection(sectionId) {
  const numericId = Number(sectionId);
  const value = Number.isFinite(numericId) ? numericId : sectionId;

  if (formData.value.sectionIds.some((id) => String(id) === String(value))) {
    formData.value.sectionIds = formData.value.sectionIds.filter(
      (id) => String(id) !== String(value),
    );
    return;
  }

  formData.value.sectionIds = [...formData.value.sectionIds, value];
}

async function submitConference() {
  if (!isFormValid()) {
    showToast("Заполните все обязательные поля");
    return;
  }

  if (!isConferenceDateInFuture()) {
    showToast("Дата и время конференции должны быть в будущем");
    return;
  }

  try {
    const selectedFiles = fileStore.files.filter((file) =>
      selectedFileIds.value.includes(getFileSelectionId(file)),
    );
    const usedFileIds = selectedFiles
      .map((file) => file.id || file.contentId || file.file_id)
      .filter(Boolean);
    const missingContentFile = selectedFiles.find(
      (file) => !file.contentId && !file.content,
    );
    if (missingContentFile) {
      showToast(
        `Файл «${missingContentFile.name}» был загружен раньше и не содержит данных для скачивания. Перезагрузите его в разделе «Материалы».`,
      );
      return;
    }

    const conferencePayload = {
      name: formData.value.name,
      description: formData.value.description,
      topic: formData.value.topic,
      date: formData.value.date,
      time: formData.value.time,
      sectionIds: formData.value.sectionIds,
      usedFileIds,
    };

    const createdConference =
      await conferenceStore.addConference(conferencePayload);

    if (!createdConference) {
      showToast("Не удалось создать конференцию: хранилище переполнено");
      return;
    }

    showToast("Конференция успешно создана!");
    router.push("/");
  } catch (error) {
    if (Number(error?.status || 0) === 403) {
      showToast(
        "Недостаточно прав. Создавать и удалять конференции может только администратор.",
      );
    } else if (
      Number(error?.status || 0) === 422 &&
      hasSectionValidationError(error)
    ) {
      showToast("Выбранная секция не относится к выбранной теме");
    } else {
      showToast(getApiErrorMessage(error, "Ошибка при создании конференции"));
    }
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

          <div class="form-group">
            <label class="form-label">Секции конференции</label>
            <p class="form-help">
              Выберите одну или несколько секций, доступных для заявок.
            </p>

            <p v-if="isLoadingSections" class="form-help">
              Загружаем секции...
            </p>

            <div
              v-else-if="availableSections.length > 0"
              class="sections-select-list"
            >
              <label
                v-for="section in availableSections"
                :key="section.id"
                class="section-select-item"
              >
                <input
                  type="checkbox"
                  :value="section.id"
                  :checked="
                    formData.sectionIds.some(
                      (sectionId) => String(sectionId) === String(section.id),
                    )
                  "
                  @change="toggleSectionSelection(section.id)"
                />
                <span class="section-select-name">{{ section.name }}</span>
              </label>
            </div>

            <p v-else class="form-help form-help--error">
              {{ sectionsError || "Секции пока не настроены." }}
            </p>
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
                v-for="(file, index) in availableFiles"
                :key="getFileKey(file, index)"
                class="file-select-item"
              >
                <input
                  type="checkbox"
                  :value="getFileSelectionId(file)"
                  :checked="selectedFileIds.includes(getFileSelectionId(file))"
                  @change="toggleFileSelection(file)"
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

.sections-select-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.section-select-item,
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

.section-select-item {
  grid-template-columns: auto 1fr;
}

.section-select-item input,
.file-select-item input {
  margin: 0;
}

.section-select-name,
.file-select-name {
  font-family: "Roboto", sans-serif;
  color: var(--text-color);
  word-break: break-word;
}

.form-help--error {
  color: #dc2626;
}

.file-select-meta {
  font-family: "Roboto", sans-serif;
  color: var(--light-text-color);
  font-size: 0.8rem;
  white-space: nowrap;
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

  .sections-select-list {
    grid-template-columns: 1fr;
  }
}
</style>
