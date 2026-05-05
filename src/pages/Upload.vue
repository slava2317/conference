<script setup>
import { onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/authStore";
import { useFileStore } from "../stores/fileStore";
import { showToast } from "../services/notificationService";
import { downloadStoredFile } from "../services/fileContentService";

const auth = useAuthStore();
const router = useRouter();
const files = useFileStore();
const fileInput = ref(null);

onMounted(() => {
  // Если пользователь не авторизован, редиректим на логин
  if (!auth.isAuthenticated) {
    showToast("Пожалуйста, авторизуйтесь для загрузки материалов");
    router.push("/login");
    return;
  }
  files.loadFiles();
});

async function upload(e) {
  if (!auth.isAuthenticated) {
    showToast("Ошибка: требуется авторизация");
    router.push("/login");
    return;
  }

  const fileList = e?.dataTransfer?.files || e?.target?.files;
  if (!fileList || fileList.length === 0) {
    showToast("Не удалось получить файлы");
    return;
  }

  await files.uploadFiles(fileList);
  showToast("Файлы загружены успешно");

  if (fileInput.value) fileInput.value.value = "";
}

function deleteFile(fileName) {
  if (confirm(`Удалить файл "${fileName}"?`)) {
    files.deleteFile(fileName);
    showToast("Файл удалён");
  }
}

async function downloadFile(file) {
  if (!(await downloadStoredFile(file))) {
    showToast("Файл недоступен для скачивания");
  }
}

function getFileIcon(fileName) {
  const ext = fileName.split(".").pop().toLowerCase();
  const icons = {
    pdf: "📄",
    doc: "📝",
    docx: "📝",
    xls: "📊",
    xlsx: "📊",
    ppt: "🎯",
    pptx: "🎯",
    zip: "📦",
    rar: "📦",
    txt: "📃",
    jpg: "🖼️",
    jpeg: "🖼️",
    png: "🖼️",
    mp4: "🎬",
    mp3: "🎵",
  };
  return icons[ext] || "📎";
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}
</script>

<template>
  <!-- Модальное окно если не авторизован -->
  <div v-if="showAuthModal" class="modal-overlay">
    <div class="modal-content">
      <div class="modal-icon">🔒</div>
      <h2 class="modal-title">Доступ ограничен</h2>
      <p class="modal-text">
        Загружать материалы могут только авторизованные пользователи
      </p>
      <div class="modal-buttons">
        <button @click="goToLogin" class="btn-login">✓ Войти</button>
        <button @click="() => (showAuthModal = false)" class="btn-close">
          ✕ Закрыть
        </button>
      </div>
    </div>
  </div>

  <div v-if="auth.isAuthenticated" class="upload-container">
    <div class="upload-wrapper">
      <!-- Загрузка файлов -->
      <div class="card">
        <h1 class="title">Мои материалы</h1>
        <p class="subtitle">Загружайте материалы конференции любого формата</p>

        <!-- Зона загрузки -->
        <div
          class="upload-zone"
          @click="$refs.fileInput?.click()"
          @dragover.prevent="
            $event.currentTarget.style.backgroundColor =
              'rgba(74, 105, 226, 0.15)'
          "
          @dragleave.prevent="
            $event.currentTarget.style.backgroundColor =
              'rgba(74, 105, 226, 0.05)'
          "
          @drop.prevent="upload($event)"
        >
          <div class="upload-icon">⬆️</div>
          <p class="upload-text">Перетащите файлы или нажмите</p>
          <p class="upload-subtext">Поддерживаются все форматы файлов</p>
        </div>

        <!-- Скрытый input -->
        <input
          ref="fileInput"
          type="file"
          multiple
          @change="upload"
          style="display: none"
        />
      </div>

      <!-- Список файлов -->
      <div v-if="files.files.length > 0" class="card">
        <h2 class="subtitle">Загруженные файлы ({{ files.files.length }})</h2>
        <div class="file-list">
          <div v-for="f in files.files" :key="f.name" class="file-item">
            <!-- Информация файла -->
            <button
              type="button"
              class="file-info file-info-button"
              @click="downloadFile(f)"
            >
              <div class="file-header">
                <span class="file-icon">{{ getFileIcon(f.name) }}</span>
                <span class="file-name">{{ f.name }}</span>
              </div>
              <div class="file-meta">
                <span>📦 {{ formatFileSize(f.size) }}</span>
                <span v-if="f.date">📅 {{ f.date }}</span>
              </div>
            </button>

            <div class="file-actions">
              <button
                type="button"
                @click="downloadFile(f)"
                class="btn-download"
              >
                Скачать
              </button>
              <!-- Кнопка удаления -->
              <button @click="deleteFile(f.name)" class="btn-delete">
                Удалить
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Сообщение если нет файлов -->
      <div v-else class="card empty-state">
        <div class="empty-icon">📭</div>
        <p class="empty-title">Нет загруженных файлов</p>
        <p class="empty-text">Начните с загрузки первого материала</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.upload-container {
  min-height: calc(100vh - 140px);
  background-color: var(--background-color);
  padding: 40px 15px;
}

.upload-wrapper {
  max-width: 700px;
  margin: 0 auto;
}

.card {
  background-color: var(--card-background-color);
  border-radius: 16px;
  padding: 30px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid var(--border-color);
  margin-bottom: 24px;
}

.title {
  font-family: "Poppins", sans-serif;
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-color);
  margin: 0 0 10px 0;
}

.subtitle {
  font-family: "Roboto", sans-serif;
  color: var(--light-text-color);
  margin: 0 0 30px 0;
  font-size: 0.95rem;
}

.upload-zone {
  border: 2px dashed var(--primary-color);
  border-radius: 12px;
  padding: 40px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background-color: rgba(74, 105, 226, 0.05);
}

.upload-zone:hover {
  background-color: rgba(74, 105, 226, 0.15);
}

.upload-icon {
  font-size: 2.5rem;
  margin-bottom: 12px;
}

.upload-text {
  font-family: "Poppins", sans-serif;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-color);
  margin: 0 0 8px 0;
}

.upload-subtext {
  font-family: "Roboto", sans-serif;
  font-size: 0.9rem;
  color: var(--light-text-color);
  margin: 0;
}

.file-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.file-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background-color: var(--background-color);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  transition: all 0.3s ease;
}

.file-item:hover {
  background-color: rgba(74, 105, 226, 0.05);
  transform: translateX(4px);
}

.file-info {
  flex: 1;
  min-width: 0;
  text-align: left;
  background: transparent;
  border: none;
  padding: 0;
  margin: 0;
  cursor: pointer;
}

.file-info-button:hover .file-name {
  color: var(--primary-color);
}

.file-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.file-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.file-icon {
  font-size: 1.5rem;
}

.file-name {
  font-family: "Roboto", sans-serif;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-color);
  word-break: break-all;
}

.file-meta {
  display: flex;
  gap: 16px;
  font-family: "Roboto", sans-serif;
  font-size: 0.8rem;
  color: var(--light-text-color);
}

.btn-delete {
  padding: 8px 12px;
  background-color: #ef4444;
  color: white;
  border: none;
  border-radius: 8px;
  font-family: "Roboto", sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
  margin-left: 12px;
}

.btn-delete:hover {
  background-color: #dc2626;
}

.btn-download {
  padding: 8px 12px;
  background-color: rgba(74, 105, 226, 0.12);
  color: var(--primary-color);
  border: 1px solid rgba(74, 105, 226, 0.24);
  border-radius: 8px;
  font-family: "Roboto", sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.btn-download:hover {
  background-color: rgba(74, 105, 226, 0.18);
}

.empty-state {
  text-align: center;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 16px;
}

.empty-title {
  font-family: "Poppins", sans-serif;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-color);
  margin: 0 0 8px 0;
}

.empty-text {
  font-family: "Roboto", sans-serif;
  color: var(--light-text-color);
  margin: 0;
}
</style>
