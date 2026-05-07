<script setup>
import { useAuthStore } from "../stores/authStore";
import { useThemeStore } from "../stores/themeStore";
import { useRouter } from "vue-router";

const auth = useAuthStore();
const theme = useThemeStore();
const router = useRouter();
async function goToAbout() {
  if (router.currentRoute.value.path !== "/") {
    await router.push("/#about");
    return;
  }

  await router.push({ path: "/", hash: "#about" });
}

function logout() {
  auth.logout();
  router.push("/");
}
</script>

<template>
  <header class="navbar-sticky">
    <nav class="navbar">
      <div class="nav-left">
        <router-link to="/" class="nav-brand">Conference</router-link>
        <button
          v-if="auth.isAuthenticated"
          class="nav-link nav-link-button"
          @click="goToAbout"
        >
          О нас
        </button>
        <router-link to="/conferences" class="nav-link"
          >Конференции</router-link
        >
        <router-link v-if="auth.isAuthenticated" to="/speakers" class="nav-link"
          >Спикеры</router-link
        >
      </div>

      <div class="nav-right">
        <button
          class="theme-toggle"
          title="Переключить тему"
          @click="theme.toggleTheme()"
        >
          <span v-if="theme.isDark">☀️</span>
          <span v-else>🌙</span>
        </button>

        <template v-if="!auth.isAuthenticated">
          <router-link to="/login" class="nav-link">Вход</router-link>
          <router-link to="/register" class="btn btn-primary"
            >Регистрация</router-link
          >
        </template>

        <template v-else>
          <router-link to="/create-conference" class="nav-link"
            >Создать конференцию</router-link
          >
          <router-link to="/upload" class="nav-link">Материалы</router-link>
          <router-link to="/profile" class="nav-link">Профиль</router-link>
          <button class="btn btn-primary" @click="logout">Выход</button>
        </template>
      </div>
    </nav>
  </header>
</template>

<style scoped>
.navbar-sticky {
  position: sticky;
  top: 0;
  width: 100%;
  background-color: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(12px);
  z-index: 1000;
  border-bottom: 1px solid var(--border-color);
  transition:
    background-color 0.3s,
    border-color 0.3s;
}

[data-theme="dark"] .navbar-sticky {
  background-color: rgba(18, 18, 18, 0.95);
}

.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 70px;
  padding: 0 24px;
  max-width: 1240px;
  width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
}

.nav-left,
.nav-right {
  display: flex;
  align-items: center;
  gap: 24px;
}

.nav-brand {
  font-family: var(--font-family-headings);
  font-weight: 700;
  font-size: 24px;
  color: var(--primary-color);
  text-decoration: none;
  margin-right: 12px;
}

.nav-link {
  text-decoration: none;
  color: var(--text-color);
  font-weight: 500;
  font-size: 0.98rem;
  transition: color 0.3s;
  white-space: nowrap;
}

.nav-link:hover {
  color: var(--primary-color);
}

.nav-link-button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  font-family: inherit;
}

.theme-toggle {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 20px;
  color: var(--text-color);
  transition: transform 0.3s;
  padding: 8px;
  border-radius: 8px;
}

.theme-toggle:hover {
  transform: scale(1.1);
  background-color: rgba(74, 105, 226, 0.08);
}

@media (max-width: 768px) {
  .navbar {
    padding: 0 20px;
    gap: 20px;
  }

  .nav-left,
  .nav-right {
    gap: 16px;
  }

  .nav-brand {
    font-size: 21px;
    margin-right: 8px;
  }

  .nav-link {
    font-size: 0.9rem;
  }
}
</style>
