<script setup>
import { ref } from "vue";
import { showToast } from "../services/notificationService";

const email = ref("");

function restore() {
  showToast(`Письмо для восстановления отправлено на ${email.value}`);
}
</script>

<template>
  <div class="form">
    <h2>Восстановление пароля</h2>
    <input v-model="email" placeholder="Email" />
    <button @click="restore">Отправить</button>
  </div>
</template>
