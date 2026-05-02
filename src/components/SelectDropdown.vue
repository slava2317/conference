<script setup>
import { computed, nextTick, ref, watch } from "vue";

const props = defineProps({
  modelValue: {
    type: String,
    required: true,
  },
  options: {
    type: Array,
    required: true,
  },
  label: {
    type: String,
    default: "",
  },
  searchable: {
    type: Boolean,
    default: false,
  },
  searchPlaceholder: {
    type: String,
    default: "Поиск спикера",
  },
});

const emit = defineEmits(["update:modelValue"]);

const isOpen = ref(false);
const searchQuery = ref("");
const searchInputRef = ref(null);

const normalizedQuery = computed(() => searchQuery.value.trim().toLowerCase());

const filteredOptions = computed(() => {
  if (!props.searchable || !normalizedQuery.value) {
    return props.options;
  }

  return props.options.filter((option) =>
    (option.searchText || option.label)
      .toLowerCase()
      .includes(normalizedQuery.value),
  );
});

const currentLabel = () => {
  const selected = props.options.find((opt) => opt.value === props.modelValue);
  return selected ? selected.label : props.label || "Выберите опцию";
};

const selectOption = (value) => {
  emit("update:modelValue", value);
  isOpen.value = false;
};

const toggleDropdown = () => {
  isOpen.value = !isOpen.value;
};

watch(isOpen, async (opened) => {
  if (!opened) {
    searchQuery.value = "";
    return;
  }

  await nextTick();
  searchInputRef.value?.focus();
});
</script>

<template>
  <div class="custom-select-container">
    <button
      v-if="!isOpen || !searchable"
      @click="toggleDropdown"
      :class="['custom-select-button', { open: isOpen }]"
      type="button"
    >
      <span class="select-label">{{ currentLabel() }}</span>
      <span class="select-icon">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </span>
    </button>

    <div
      v-else
      :class="[
        'custom-select-button',
        'custom-select-button--search',
        { open: isOpen },
      ]"
    >
      <input
        ref="searchInputRef"
        v-model="searchQuery"
        type="text"
        class="custom-select-search-input custom-select-search-input--inline"
        :placeholder="searchPlaceholder"
        @click.stop
      />
      <button class="select-icon-button" type="button" @click="toggleDropdown">
        <span class="select-icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </span>
      </button>
    </div>

    <transition name="dropdown">
      <div
        v-if="isOpen"
        :class="[
          'custom-select-menu',
          { 'custom-select-menu--searchable': searchable },
        ]"
      >
        <div v-if="filteredOptions.length === 0" class="custom-select-empty">
          Ничего не найдено
        </div>

        <button
          v-for="option in filteredOptions"
          :key="option.value"
          @click="selectOption(option.value)"
          :class="[
            'custom-select-option',
            { selected: modelValue === option.value },
          ]"
          type="button"
        >
          <span class="option-checkmark" v-if="modelValue === option.value"
            >✓</span
          >
          <span class="option-label">{{ option.label }}</span>
        </button>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.custom-select-container {
  position: relative;
  width: 100%;
}

.custom-select-button {
  width: 100%;
  padding: 12px 14px;
  border: 2px solid var(--border-color);
  border-radius: 10px;
  background-color: var(--card-background-color);
  color: var(--text-color);
  font-family: "Roboto", sans-serif;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: space-between;
  text-align: left;
}

.custom-select-button:hover:not(.open) {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(74, 105, 226, 0.08);
}

.custom-select-button.open {
  border-color: var(--primary-color);
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  box-shadow: 0 0 0 3px rgba(74, 105, 226, 0.1);
}

.custom-select-button--search {
  padding: 0 12px 0 0;
  gap: 8px;
}

.select-label {
  flex: 1;
  display: block;
}

.select-icon-button {
  border: none;
  background: transparent;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
}

.select-icon {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-color);
  transition: transform 0.3s ease;
  flex-shrink: 0;
  margin-left: 8px;
}

.custom-select-button.open .select-icon {
  transform: rotate(180deg);
}

.custom-select-menu {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background-color: var(--card-background-color);
  border: 2px solid var(--primary-color);
  border-top: none;
  border-bottom-left-radius: 10px;
  border-bottom-right-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  z-index: 100;
  overflow: hidden;
  max-height: 300px;
  overflow-y: auto;
}

.custom-select-menu--searchable {
  max-height: 168px;
}

.custom-select-search-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background-color: var(--card-background-color);
  color: var(--text-color);
  font-family: "Roboto", sans-serif;
  font-size: 0.92rem;
  outline: none;
}

.custom-select-search-input--inline {
  border: none;
  box-shadow: none;
  padding: 12px 14px;
  flex: 1;
  min-width: 0;
}

.custom-select-search-input:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(74, 105, 226, 0.1);
}

.custom-select-empty {
  padding: 14px;
  color: var(--text-muted-color, #667085);
  font-size: 0.92rem;
  background-color: var(--card-background-color);
}

.custom-select-option {
  width: 100%;
  padding: 12px 14px;
  border: none;
  background-color: var(--card-background-color);
  color: var(--text-color);
  font-family: "Roboto", sans-serif;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 10px;
  text-align: left;
}

.custom-select-option:not(:last-child) {
  border-bottom: 1px solid var(--border-color);
}

.custom-select-option:hover {
  background-color: rgba(74, 105, 226, 0.1);
}

.custom-select-option.selected {
  background-color: rgba(74, 105, 226, 0.15);
  font-weight: 600;
  color: var(--primary-color);
}

.option-checkmark {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary-color);
  font-weight: 700;
  font-size: 0.9rem;
  flex-shrink: 0;
}

.option-label {
  flex: 1;
}

.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from {
  opacity: 0;
  transform: translateY(-5px);
}

.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}

::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background-color: var(--border-color);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background-color: var(--primary-color);
}
</style>
