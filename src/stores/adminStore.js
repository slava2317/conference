import { defineStore } from "pinia";
import * as adminService from "../services/adminService";
import * as applicationService from "../services/applicationService";
import * as roleRequestService from "../services/roleRequestService";

export const useAdminStore = defineStore("admin", {
  state: () => ({
    users: [],
    applications: [],
    roleRequests: [],
    isLoading: false,
    isLoadingApplications: false,
    isLoadingRoleRequests: false,
    updatingUserId: null,
    deletingUserId: null,
    updatingApplicationId: null,
    updatingRoleRequestId: null,
  }),

  actions: {
    async loadUsers() {
      this.isLoading = true;
      try {
        this.users = await adminService.getAdminUsers();
        return this.users;
      } finally {
        this.isLoading = false;
      }
    },

    async loadRoleRequests(status = "") {
      this.isLoadingRoleRequests = true;
      try {
        this.roleRequests =
          await roleRequestService.getAdminRoleRequests(status);
        return this.roleRequests;
      } finally {
        this.isLoadingRoleRequests = false;
      }
    },

    async loadApplications() {
      this.isLoadingApplications = true;
      try {
        this.applications = await applicationService.getAdminApplications();
        return this.applications;
      } finally {
        this.isLoadingApplications = false;
      }
    },

    async makeUserAdmin(userId) {
      this.updatingUserId = userId;
      try {
        await adminService.updateAdminUserRole(userId, "admin");
        await this.loadUsers();
      } finally {
        this.updatingUserId = null;
      }
    },

    async deleteUser(userId) {
      this.deletingUserId = userId;
      try {
        await adminService.deleteAdminUser(userId);
        this.users = this.users.filter((user) => {
          const id = user?.id || user?.participantId || user?.email || "";
          return String(id) !== String(userId);
        });
        return true;
      } finally {
        this.deletingUserId = null;
      }
    },

    async updateRoleRequest(requestId, status, comment) {
      this.updatingRoleRequestId = requestId;
      try {
        await roleRequestService.updateAdminRoleRequest(
          requestId,
          status,
          comment,
        );
        await this.loadRoleRequests();
      } finally {
        this.updatingRoleRequestId = null;
      }
    },

    async updateApplication(applicationId, status, comment = "") {
      this.updatingApplicationId = applicationId;
      try {
        await applicationService.updateAdminApplication(
          applicationId,
          status,
          comment,
        );
        await this.loadApplications();
      } finally {
        this.updatingApplicationId = null;
      }
    },

    clear() {
      this.users = [];
      this.applications = [];
      this.roleRequests = [];
      this.updatingUserId = null;
      this.deletingUserId = null;
      this.updatingApplicationId = null;
      this.updatingRoleRequestId = null;
      this.isLoading = false;
      this.isLoadingApplications = false;
      this.isLoadingRoleRequests = false;
    },
  },
});
