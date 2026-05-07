<template>
  <div class="container">
    <h1 class="page-title">Расписание</h1>

    <div class="filters">
      <select v-model="selectedTopic" class="filter-select">
        <option value="">Все потоки</option>
        <option
          v-for="topic in topicOptions"
          :key="topic.value"
          :value="topic.value"
        >
          {{ topic.label }}
        </option>
      </select>
      <input
        type="text"
        v-model="searchQuery"
        placeholder="Поиск по названию или спикеру..."
        class="filter-input"
      />
    </div>

    <div class="schedule-grid">
      <div
        v-for="event in filteredSchedule"
        :key="event.id"
        class="card event-card fade-in"
      >
        <div class="event-time">{{ event.time }}</div>
        <div class="event-details">
          <h3 class="event-title">{{ event.title }}</h3>
          <p class="event-speaker">{{ event.speaker }}</p>
          <span class="tag">{{ event.topicLabel }}</span>
        </div>
        <button
          class="favorite-btn"
          @click="toggleFavorite(event.id)"
          :class="{ 'is-favorite': isFavorite(event.id) }"
        >
          &#9733;
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useConferenceStore } from "../stores/conferenceStore";
import { CONFERENCE_TOPICS_ARRAY } from "../constants/topics";

const conferenceStore = useConferenceStore();
const conferences = computed(() => conferenceStore.getConferences());
const topicOptions = CONFERENCE_TOPICS_ARRAY;
const selectedTopic = ref("");
const searchQuery = ref("");
const favorites = ref(JSON.parse(localStorage.getItem("favorites")) || []);

onMounted(() => {
  conferenceStore.loadConferences();
});

function parseConferenceDate(conference) {
  if (!conference?.date) return Number.MAX_SAFE_INTEGER;
  const timePart = conference.time || "00:00";
  const parsed = new Date(`${conference.date}T${timePart}:00`);
  return Number.isNaN(parsed.getTime())
    ? Number.MAX_SAFE_INTEGER
    : parsed.getTime();
}

function formatConferenceTime(conference) {
  if (!conference?.time) return "—";
  return conference.time;
}

function formatSpeakerName(conference) {
  const speaker = conference?.speaker;
  if (!speaker) return "—";

  const fullName = `${speaker.firstName || speaker.first_name || ""} ${
    speaker.lastName || speaker.last_name || ""
  }`.trim();

  return fullName || speaker.email || "—";
}

const scheduleItems = computed(() =>
  [...conferences.value]
    .sort(
      (first, second) =>
        parseConferenceDate(first) - parseConferenceDate(second),
    )
    .map((conference) => ({
      id: conference.id,
      time: formatConferenceTime(conference),
      title: conference.name || "Без названия",
      speaker: formatSpeakerName(conference),
      topic: conference.topic || "",
      topicLabel:
        topicOptions.find((item) => item.value === conference.topic)?.label ||
        conference.topic ||
        "Тема не указана",
    })),
);

const filteredSchedule = computed(() => {
  return scheduleItems.value.filter((event) => {
    const matchesTopic =
      !selectedTopic.value || event.topic === selectedTopic.value;
    const matchesSearch =
      !searchQuery.value ||
      event.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      event.speaker.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      event.topicLabel.toLowerCase().includes(searchQuery.value.toLowerCase());
    return matchesTopic && matchesSearch;
  });
});

function toggleFavorite(id) {
  const index = favorites.value.indexOf(id);
  if (index > -1) {
    favorites.value.splice(index, 1);
  } else {
    favorites.value.push(id);
  }
  localStorage.setItem("favorites", JSON.stringify(favorites.value));
}

function isFavorite(id) {
  return favorites.value.includes(id);
}
</script>

<style scoped>
.filters {
  display: flex;
  gap: 15px;
  margin-bottom: 2rem;
}
.filter-select,
.filter-input {
  padding: 10px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background-color: var(--card-background-color);
  color: var(--text-color);
  font-family: var(--font-family-body);
}
.filter-input {
  flex-grow: 1;
}

.event-card {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 15px;
}
.event-time {
  font-weight: 600;
  font-size: 1.1rem;
  color: var(--primary-color);
  width: 120px;
}
.event-details {
  flex-grow: 1;
}
.event-title {
  margin: 0 0 5px 0;
}
.event-speaker {
  color: var(--light-text-color);
  margin: 0 0 10px 0;
}
.tag {
  background-color: var(--secondary-color);
  color: white;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.8rem;
}
.favorite-btn {
  background: none;
  border: none;
  font-size: 1.8rem;
  cursor: pointer;
  color: var(--border-color);
  transition:
    color 0.3s,
    transform 0.3s;
}
.favorite-btn:hover {
  transform: scale(1.2);
}
.favorite-btn.is-favorite {
  color: var(--secondary-color);
}
</style>
