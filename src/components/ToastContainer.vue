<template>
  <transition-group name="toast" tag="div" class="toast-wrapper">
    <div v-for="t in toasts" :key="t.id" class="toast">
      <div class="toast-message">{{ t.message }}</div>
      <button class="toast-close" @click="remove(t.id)">✕</button>
    </div>
  </transition-group>
</template>

<script setup>
import { toasts, removeToast } from "../services/notificationService";

function remove(id) {
  removeToast(id);
}
</script>

<style scoped>
.toast-wrapper {
  position: fixed;
  right: 18px;
  bottom: 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 11000;
}

.toast {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(17, 24, 39, 0.9);
  color: #fff;
  padding: 10px 14px;
  border-radius: 8px;
  box-shadow: 0 6px 18px rgba(20, 24, 40, 0.12);
}

.toast-message {
  flex: 1;
}
.toast-close {
  background: transparent;
  border: none;
  color: #fff;
  cursor: pointer;
}

/* simple transition */
.toast-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.toast-enter-active {
  transition: all 180ms ease;
}
.toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
.toast-leave-active {
  transition: all 150ms ease;
}
</style>
