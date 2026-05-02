<template>
  <div class="container">
    <h1 class="text-center mb-4">Расписание</h1>

    <div class="filters">
      <select v-model="selectedTrack" class="filter-select">
        <option value="">Все потоки</option>
        <option v-for="track in tracks" :key="track" :value="track">
          {{ track }}
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
          <span class="tag">{{ event.track }}</span>
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
import { ref, computed } from "vue";

const schedule = ref([
  {
    id: 1,
    time: "10:00 - 11:00",
    title: "Введение в квантовые вычисления",
    speaker: "Елена Волкова",
    track: "Искусственный интеллект",
  },
  {
    id: 2,
    time: "11:00 - 12:00",
    title: "Архитектура современных веб-приложений",
    speaker: "Алексей Петров",
    track: "Веб-разработка",
  },
  {
    id: 3,
    time: "12:00 - 13:00",
    title: "Атаки на корпоративные сети: методы и защита",
    speaker: "Иван Сидоров",
    track: "Кибербезопасность",
  },
  {
    id: 4,
    time: "14:00 - 15:00",
    title: "Генеративные модели в действии",
    speaker: "Елена Волкова",
    track: "Искусственный интеллект",
  },
]);

const tracks = computed(() => [...new Set(schedule.value.map((e) => e.track))]);
const selectedTrack = ref("");
const searchQuery = ref("");
const favorites = ref(JSON.parse(localStorage.getItem("favorites")) || []);

const filteredSchedule = computed(() => {
  return schedule.value.filter((event) => {
    const matchesTrack =
      !selectedTrack.value || event.track === selectedTrack.value;
    const matchesSearch =
      !searchQuery.value ||
      event.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      event.speaker.toLowerCase().includes(searchQuery.value.toLowerCase());
    return matchesTrack && matchesSearch;
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
  transition: color 0.3s, transform 0.3s;
}
.favorite-btn:hover {
  transform: scale(1.2);
}
.favorite-btn.is-favorite {
  color: var(--secondary-color);
}
</style>
