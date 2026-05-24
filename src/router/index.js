import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../stores/authStore";

import HomePage from "../pages/HomePage.vue";
import Register from "../pages/Register.vue";
import Login from "../pages/Login.vue";
import ForgotPassword from "../pages/ForgotPassword.vue";
import Upload from "../pages/Upload.vue";
import Profile from "../pages/Profile.vue";
import CreateConference from "../pages/CreateConference.vue";
import ConferencesPage from "../pages/ConferencesPage.vue";
import ConferenceApplicationPage from "../pages/ConferenceApplicationPage.vue";
import ReviewerReviewsPage from "../pages/ReviewerReviewsPage.vue";
import SpeakerReviewsPage from "../pages/SpeakerReviewsPage.vue";
import AdminPage from "../pages/AdminPage.vue";
import { showToast } from "../services/notificationService";

const routes = [
  { path: "/", component: HomePage },
  { path: "/register", component: Register },
  { path: "/login", component: Login },
  { path: "/forgot", component: ForgotPassword },
  { path: "/upload", component: Upload, meta: { requiresAuth: true } },
  { path: "/profile", component: Profile, meta: { requiresAuth: true } },
  { path: "/speakers", redirect: "/conferences" },
  { path: "/schedule", redirect: "/conferences" },
  {
    path: "/create-conference",
    component: CreateConference,
    meta: {
      requiresAuth: true,
      requiresAdmin: true,
      adminMessage: "Создавать конференции может только администратор.",
    },
  },
  { path: "/conferences", component: ConferencesPage },
  {
    path: "/conferences/:id/apply/:type",
    component: ConferenceApplicationPage,
    meta: { requiresAuth: true },
  },
  {
    path: "/reviews",
    component: ReviewerReviewsPage,
    meta: { requiresAuth: true, requiresReviewer: true },
  },
  {
    path: "/report-reviews",
    component: SpeakerReviewsPage,
    meta: { requiresAuth: true },
  },
  {
    path: "/admin",
    component: AdminPage,
    meta: {
      requiresAuth: true,
      requiresAdmin: true,
      adminMessage: "Админ-раздел доступен только администраторам",
    },
  },
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

router.beforeEach(async (to, from, next) => {
  const auth = useAuthStore();

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    const user = await auth.bootstrap();
    if (!user) {
      next("/login");
      return;
    }
  }

  if (to.meta.requiresAdmin) {
    await auth.refreshProfile();
    if (!auth.isAdmin) {
      showToast(to.meta.adminMessage || "Доступ разрешен только администратору");
      next("/");
      return;
    }
  }

  if (to.meta.requiresReviewer) {
    await auth.refreshProfile();
    if (auth.user?.reviewerStatus !== "approved") {
      showToast("Раздел рецензий доступен только подтвержденным рецензентам");
      next("/profile");
      return;
    }
  }

  next();
});

export default router;
