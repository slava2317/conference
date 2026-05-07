<script setup>
import { computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { CONFERENCE_TOPICS_ARRAY } from "../constants/topics";
import { useConferenceStore } from "../stores/conferenceStore";

const topics = CONFERENCE_TOPICS_ARRAY;
const conferenceStore = useConferenceStore();
const router = useRouter();

const conferences = computed(() => conferenceStore.getConferences());

onMounted(() => {
  conferenceStore.loadConferences();
});

function parseConferenceDate(conference) {
  if (!conference?.date) return null;
  const timePart = conference.time || "00:00";
  const parsed = new Date(`${conference.date}T${timePart}:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

const nearestConference = computed(() => {
  const upcomingConferences = conferences.value
    .map((conference) => ({
      conference,
      date: parseConferenceDate(conference),
    }))
    .filter(({ date }) => date && date.getTime() > Date.now())
    .sort((first, second) => first.date.getTime() - second.date.getTime());

  return upcomingConferences[0]?.conference || null;
});

function formatConferenceDate(conference) {
  const date = parseConferenceDate(conference);
  if (!date) return "Дата не указана";

  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function compactDisplayName(value) {
  if (!value) return "";

  const parts = String(value).trim().split(/\s+/).filter(Boolean);

  if (parts.length <= 1) {
    return parts[0] || "";
  }

  const collapsed = [];
  for (const part of parts) {
    if (collapsed[collapsed.length - 1] !== part) {
      collapsed.push(part);
    }
  }

  return collapsed.join(" ").trim();
}

function getConferenceCreatorLabel(conference) {
  if (!conference?.createdBy) return "—";

  if (typeof conference.createdBy === "object") {
    const explicitName = compactDisplayName(conference.createdBy.name);
    if (explicitName) return explicitName;

    const firstName = compactDisplayName(conference.createdBy.firstName);
    const lastName = compactDisplayName(conference.createdBy.lastName);

    if (firstName && lastName) {
      return firstName === lastName ? firstName : `${firstName} ${lastName}`;
    }

    return compactDisplayName(conference.createdBy.email) || "—";
  }

  return compactDisplayName(conference.createdBy) || "—";
}

function getConferenceFilesCount(conference) {
  return Array.isArray(conference?.usedFiles) ? conference.usedFiles.length : 0;
}

function getConferenceBookingsCount(conference) {
  return Array.isArray(conference?.bookings) ? conference.bookings.length : 0;
}

function openTopicConferences(topic) {
  router.push({
    path: "/conferences",
    query: { topic },
  });
}
</script>

<template>
  <div class="home-page">
    <div id="top-anchor" class="top-anchor"></div>
    <section class="hero-section surface-panel">
      <h1 class="hero-title">
        Conference — платформа для управления конференциями
      </h1>
      <p class="hero-text hero-text--lead">
        Conference — это современный сервис для публикации, сопровождения и
        участия в конференциях. Платформа объединяет организаторов, спикеров и
        аудиторию в едином цифровом пространстве, обеспечивая быстрый доступ к
        актуальным событиям, материалам и данным о выступлениях.
      </p>
      <p class="hero-text">
        Решение подходит для ежедневной работы с мероприятиями: от просмотра
        расписания и тематик до публикации новых конференций и сопровождения
        участников. Интерфейс спроектирован так, чтобы сокращать количество
        действий и упрощать навигацию по всем ключевым разделам.
      </p>
      <router-link to="/conferences" class="hero-button">
        Просмотреть мероприятия
      </router-link>
    </section>

    <section class="nearest-section">
      <div class="nearest-card">
        <div class="nearest-header">
          <p class="section-label">Ближайшая конференция</p>
          <h2 class="nearest-title">
            {{
              nearestConference
                ? nearestConference.name
                : "На ближайшее время конференции не запланированы"
            }}
          </h2>
        </div>

        <div v-if="nearestConference" class="nearest-content">
          <p class="nearest-lead">
            Следующее событие на платформе уже доступно для просмотра и
            подготовки к участию.
          </p>

          <div class="nearest-grid">
            <div class="nearest-item">
              <span class="nearest-label">Когда проводится</span>
              <span class="nearest-value">
                {{ formatConferenceDate(nearestConference) }} в
                {{ nearestConference.time || "00:00" }}
              </span>
            </div>

            <div class="nearest-item">
              <span class="nearest-label">Тема</span>
              <span class="nearest-value">
                {{
                  topics.find(
                    (topic) => topic.value === nearestConference.topic,
                  )?.label || "Тема не указана"
                }}
              </span>
            </div>

            <div class="nearest-item">
              <span class="nearest-label">Спикер</span>
              <span class="nearest-value">
                {{ nearestConference.speaker?.firstName || "—" }}
                {{ nearestConference.speaker?.lastName || "" }}
              </span>
            </div>

            <div class="nearest-item nearest-item--wide">
              <span class="nearest-label">Описание</span>
              <span class="nearest-value nearest-value--muted">
                {{
                  nearestConference.description ||
                  "Описание конференции будет опубликовано дополнительно."
                }}
              </span>
            </div>

            <div class="nearest-item">
              <span class="nearest-label">Автор</span>
              <span class="nearest-value">
                {{ getConferenceCreatorLabel(nearestConference) }}
              </span>
            </div>

            <div class="nearest-item">
              <span class="nearest-label">Файлы</span>
              <span class="nearest-value">
                {{ getConferenceFilesCount(nearestConference) }}
              </span>
            </div>

            <div class="nearest-item nearest-item--wide">
              <span class="nearest-label">Бронирования</span>
              <span class="nearest-value">
                {{ getConferenceBookingsCount(nearestConference) }}
              </span>
            </div>
          </div>
        </div>

        <div v-else class="nearest-content nearest-content--empty">
          <p class="nearest-lead">
            Ближайшая конференция будет отображена здесь сразу после публикации
            нового события.
          </p>
        </div>
      </div>
    </section>

    <section id="about" class="about-section surface-panel">
      <div class="about-header">
        <p class="section-label section-label--large">О нас</p>
        <h2 class="about-title">
          Платформа Conference: единый стандарт работы с конференциями
        </h2>
        <p class="about-lead">
          Conference создана как единая цифровая среда для управления
          конференциями, информирования аудитории и организации участия в
          мероприятиях. Сервис помогает структурировать события, выстраивать
          понятный пользовательский путь и поддерживать актуальность всей
          информации на площадке.
        </p>
      </div>

      <div class="about-columns">
        <div class="about-column">
          <h3>Что представляет собой сервис</h3>
          <p>
            Это функциональная платформа для централизованного размещения
            информации о конференциях и сопутствующих материалах. Вся ключевая
            информация собрана в одном интерфейсе: карточки мероприятий,
            описания, данные о спикерах, дата и время начала, а также
            тематическая структура.
          </p>
          <p>
            Такой формат позволяет участникам быстрее ориентироваться в
            событиях, сравнивать конференции между собой и принимать взвешенное
            решение об участии.
          </p>
        </div>

        <div class="about-column">
          <h3>Функциональные возможности</h3>
          <p>
            Сервис предоставляет возможности просмотра конференций, фильтрации
            по темам, ознакомления со спикерами и управления собственным
            профилем. Для организаторов предусмотрены инструменты публикации
            новых мероприятий и обновления уже размещённой информации.
          </p>
          <p>
            Платформа также поддерживает работу с материалами конференций и
            позволяет быстро переходить между разделами без потери контекста.
          </p>
        </div>

        <div class="about-column">
          <h3>На какие темы проводятся конференции</h3>
          <p>
            На платформе представлены мероприятия по нескольким основным
            направлениям, чтобы охватить интересы широкой аудитории: технологии,
            бизнес, наука, образование, здоровье и искусство. Такой набор тем
            отражает формат современных отраслевых и междисциплинарных
            конференций.
          </p>
          <div class="topic-list">
            <button
              v-for="topic in topics"
              :key="topic.value"
              type="button"
              class="topic-pill topic-pill-button"
              @click="openTopicConferences(topic.value)"
            >
              {{ topic.label }}
            </button>
          </div>
        </div>

        <div class="about-column about-column--wide">
          <h3>Сервисы платформы</h3>
          <ul class="about-list">
            <li>Актуальный перечень конференций с тематической структурой.</li>
            <li>
              Подробные карточки мероприятий с информацией о содержании и
              спикерах.
            </li>
            <li>Материалы, прикреплённые к выбранной конференции.</li>
            <li>
              Публикация и сопровождение событий через пользовательский кабинет.
            </li>
            <li>
              Быстрая навигация по разделам и понятный интерфейс работы с
              контентом.
            </li>
          </ul>
        </div>

        <div class="about-column about-column--wide">
          <h3>Порядок взаимодействия с сайтом</h3>
          <p>
            Пользователь открывает сайт, знакомится с общей информацией,
            переходит к разделу конференций, выбирает интересующее событие и
            изучает его детали. При необходимости можно оформить участие и
            отслеживать статус выбранной конференции.
          </p>
          <p>
            Интерфейс платформы выстроен по принципам современного цифрового
            сервиса, где всё необходимое собрано в одном месте и доступно без
            лишних переходов.
          </p>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home-page {
  max-width: 1200px;
  margin: 0 auto;
  background-color: var(--background-color);
  padding: 0 15px 40px;
}

.top-anchor {
  position: relative;
  top: -90px;
  height: 0;
}

.hero-section {
  min-height: auto;
  padding: 80px 0 56px;
  margin-top: 40px;
  margin-bottom: 40px;
  text-align: center;
}

.surface-panel {
  background-color: var(--card-background-color);
  border: 1px solid rgba(74, 105, 226, 0.12);
  border-radius: 18px;
  box-shadow: 0 14px 40px rgba(27, 39, 94, 0.06);
}

.hero-title {
  font-size: 2.15rem;
  margin-bottom: 1rem;
  font-weight: 700;
  font-family: "Poppins", sans-serif;
  color: var(--text-color);
}

.hero-text {
  font-size: 1.02rem;
  color: var(--text-color);
  max-width: 740px;
  margin: 0 auto 1rem;
  line-height: 1.7;
  font-family: "Roboto", sans-serif;
  text-align: justify;
  text-indent: 1.25em;
}

.hero-text--lead {
  max-width: 800px;
}

.hero-button {
  display: inline-block;
  padding: 12px 24px;
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 500;
  transition: all 0.3s ease;
  cursor: pointer;
  font-family: "Roboto", sans-serif;
}

.hero-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(74, 105, 226, 0.3);
}

.nearest-section {
  padding: 0 0 26px;
  margin-top: -8px;
}

.nearest-card {
  background-color: var(--card-background-color);
  border: 1px solid rgba(74, 105, 226, 0.12);
  border-radius: 18px;
  padding: 32px;
  box-shadow: 0 14px 40px rgba(27, 39, 94, 0.06);
}

.nearest-header {
  max-width: 860px;
  margin: 0 auto 20px;
  text-align: center;
}

.nearest-title {
  margin: 0;
  font-family: "Poppins", sans-serif;
  font-size: 1.8rem;
  color: var(--text-color);
  line-height: 1.25;
}

.nearest-content {
  max-width: 980px;
  margin: 0 auto;
}

.nearest-content--empty {
  text-align: center;
}

.nearest-lead {
  margin: 0 0 20px;
  color: var(--light-text-color);
  font-family: "Roboto", sans-serif;
  font-size: 1.05rem;
  line-height: 1.75;
  text-align: justify;
  text-indent: 1.25em;
}

.nearest-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.nearest-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 18px 20px;
  border-radius: 14px;
  background-color: var(--card-background-color);
  border: 1px solid var(--border-color);
}

.nearest-item--wide {
  grid-column: 1 / -1;
}

.nearest-label {
  font-family: "Roboto", sans-serif;
  font-size: 0.82rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--primary-color);
}

.nearest-value {
  font-family: "Roboto", sans-serif;
  font-size: 1rem;
  line-height: 1.65;
  color: var(--text-color);
  text-align: justify;
}

.nearest-value--muted {
  color: var(--light-text-color);
}

.about-section {
  padding: 40px 32px 36px;
  scroll-margin-top: 140px;
  margin-top: 0;
}

.about-header {
  max-width: 900px;
  margin: 0 auto 36px;
  text-align: center;
}

.section-label {
  margin: 0 0 12px;
  color: var(--primary-color);
  font-size: 1.05rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-family: "Roboto", sans-serif;
}

.section-label--large {
  font-size: 1.65rem;
  font-weight: 900;
  letter-spacing: 0.1em;
}

.about-title {
  margin: 0 0 16px;
  font-family: "Poppins", sans-serif;
  font-size: 1.7rem;
  color: var(--text-color);
  line-height: 1.25;
}

.about-lead {
  margin: 0;
  color: var(--light-text-color);
  font-size: 1.05rem;
  line-height: 1.8;
  font-family: "Roboto", sans-serif;
  text-align: justify;
  text-indent: 1.25em;
}

.about-columns {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 28px;
}

.about-column {
  padding: 0;
}

.about-column h3 {
  margin: 0 0 14px;
  font-family: "Poppins", sans-serif;
  font-size: 1.2rem;
  color: var(--text-color);
}

.about-column p {
  margin: 0 0 14px;
  color: var(--text-color);
  font-family: "Roboto", sans-serif;
  line-height: 1.75;
  text-align: justify;
  text-indent: 1.25em;
}

.about-column--wide {
  grid-column: 1 / -1;
  padding-top: 6px;
}

.about-column--wide .about-list,
.about-column--wide li {
  text-align: left;
  text-indent: 0;
}

.topic-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
}

.topic-pill {
  display: inline-flex;
  align-items: center;
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(255, 165, 0, 0.16);
  color: var(--text-color);
  font-family: "Roboto", sans-serif;
  font-size: 0.9rem;
  font-weight: 600;
}

.topic-pill-button {
  border: none;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    background-color 0.2s ease;
}

.topic-pill-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 18px rgba(255, 165, 0, 0.18);
}

.topic-pill-button:focus-visible {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
}

.about-list {
  margin: 0;
  padding-left: 20px;
  color: var(--text-color);
  font-family: "Roboto", sans-serif;
  line-height: 1.8;
}

.about-list li + li {
  margin-top: 8px;
}

@media (max-width: 768px) {
  .hero-section {
    padding: 60px 0 80px;
  }

  .hero-title {
    font-size: 1.7rem;
  }

  .about-title {
    font-size: 1.35rem;
  }

  .nearest-card {
    padding: 24px 18px;
  }

  .nearest-title {
    font-size: 1.4rem;
  }

  .nearest-grid {
    grid-template-columns: 1fr;
  }
}
</style>
