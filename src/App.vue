<script setup>
import { onMounted, onBeforeUnmount } from "vue";
import Navbar from "./components/Navbar.vue";
import ToastContainer from "./components/ToastContainer.vue";
import { useThemeStore } from "./stores/themeStore";
import { useConferenceStore } from "./stores/conferenceStore";
import { useAuthStore } from "./stores/authStore";
import { showToast } from "./services/notificationService";

const theme = useThemeStore();
const conferenceStore = useConferenceStore();
const auth = useAuthStore();
let reminderTimerId = null;

function processConferenceReminders() {
  const dueBookings = conferenceStore.getDueReminderBookings(new Date());

  dueBookings.forEach(({ conference, booking }) => {
    const reminderText = `Через час начнется конференция «${conference.name}» (${conference.date} в ${conference.time}).`;

    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification("Напоминание о конференции", {
          body: reminderText,
        });
      }
    }

    showToast(reminderText);
    conferenceStore.markReminderSent(conference.id, booking.email);
  });
}

onMounted(() => {
  theme.initTheme();
  (async () => {
    await auth.bootstrap();
    await conferenceStore.loadConferences?.();
    processConferenceReminders();
    reminderTimerId = window.setInterval(processConferenceReminders, 60000);
  })();
});

onBeforeUnmount(() => {
  if (reminderTimerId !== null) {
    window.clearInterval(reminderTimerId);
    reminderTimerId = null;
  }
});
</script>

<template>
  <Navbar />
  <main class="main-content">
    <router-view />
  </main>
  <ToastContainer />
</template>

<style>
/* global styles kept in styles.css */
</style>
