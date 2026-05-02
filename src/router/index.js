import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../stores/authStore";

import HomePage from "../pages/HomePage.vue";
import Register from "../pages/Register.vue";
import Login from "../pages/Login.vue";
import ForgotPassword from "../pages/ForgotPassword.vue";
import Upload from "../pages/Upload.vue";
import Profile from "../pages/Profile.vue";
import SpeakersPage from "../pages/SpeakersPage.vue";
import CreateConference from "../pages/CreateConference.vue";
import ConferencesPage from "../pages/ConferencesPage.vue";

const routes = [
  { path: "/", component: HomePage },
  { path: "/register", component: Register },
  { path: "/login", component: Login },
  { path: "/forgot", component: ForgotPassword },
  { path: "/upload", component: Upload },
  { path: "/profile", component: Profile },
  { path: "/speakers", component: SpeakersPage },
  { path: "/create-conference", component: CreateConference },
  { path: "/conferences", component: ConferencesPage },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    }

    if (to.hash) {
      return new Promise((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const element = document.querySelector(to.hash);
            if (!element) {
              resolve({ top: 0, behavior: "smooth" });
              return;
            }

            const rect = element.getBoundingClientRect();
            const elementTop = window.scrollY + rect.top;
            const centeredTop = Math.max(
              0,
              elementTop - (window.innerHeight - rect.height) / 2,
            );

            resolve({ top: centeredTop, behavior: "smooth" });
          });
        });
      });
    }

    return { top: 0, behavior: "smooth" };
  },
});

// защита маршрута загрузки
router.beforeEach((to, from, next) => {
  const auth = useAuthStore();

  if (
    (to.path === "/upload" ||
      to.path === "/profile" ||
      to.path === "/create-conference") &&
    !auth.isAuthenticated
  ) {
    next("/login");
  } else {
    next();
  }
});

export default router;
