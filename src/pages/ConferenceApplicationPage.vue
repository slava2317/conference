<script setup>
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import SelectDropdown from "../components/SelectDropdown.vue";
import { useAuthStore } from "../stores/authStore";
import { useConferenceStore } from "../stores/conferenceStore";
import { useFileStore } from "../stores/fileStore";
import {
  createConferenceApplication,
  getConferenceSectionOptions,
} from "../services/applicationService";
import { getApplicationDictionaries } from "../services/applicationDictionaryService";
import { getApiErrorMessage } from "../services/apiErrorService";
import {
  ALLOWED_UPLOAD_ACCEPT,
  ALLOWED_UPLOAD_MESSAGE,
  validateUploadFiles,
} from "../services/fileUploadValidationService";
import { showToast } from "../services/notificationService";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const conferenceStore = useConferenceStore();
const fileStore = useFileStore();

const typeParam = computed(() =>
  route.params.type === "reviewer" ? "reviewer" : "speaker",
);
const conferenceId = computed(() => String(route.params.id || ""));
const conference = computed(() =>
  conferenceStore.getConferenceById(conferenceId.value),
);
const isSpeaker = computed(() => typeParam.value === "speaker");
const pageTitle = computed(() =>
  isSpeaker.value
    ? "Заявка докладчика"
    : "Заявка рецензента",
);
const pageLead = computed(() => conference.value?.name || "Конференция");
const conferenceSectionOptions = computed(() =>
  getConferenceSectionOptions(conference.value),
);
const globalSectionOptions = computed(() =>
  globalSections.value.map((section) => ({
    value: String(section.id),
    label: section.name || `Секция ${section.id}`,
  })),
);
const sectionOptions = computed(() => conferenceSectionOptions.value);
const sectionOptionsForForm = computed(() =>
  reviewerUsesGlobalSection.value
    ? globalSectionOptions.value
    : isSpeaker.value
      ? sectionOptions.value
      : conferenceSectionOptions.value,
);
const applications = computed(() =>
  conferenceStore.getApplicationsByConferenceId(conferenceId.value),
);
const activeApplication = computed(() =>
  applications.value.find((application) =>
    ["pending", "approved"].includes(application?.status),
  ),
);
const blockingApplication = computed(() => {
  const active = activeApplication.value;
  if (!active) return null;
  if (active.type === typeParam.value) return active;
  return active;
});

const form = reactive({
  sectionId: "",
  reviewerScope: "conference",
  lastName: "",
  firstName: "",
  middleName: "",
  email: "",
  phone: "",
  country: "",
  organization: "",
  educationStatus: "",
  educationForm: "",
  fundingForm: "",
  reportTitle: "",
  additionalInfo: "",
  commentForReviewer: "",
  degree: "",
  academicTitle: "",
});
const selectedFile = ref(null);
const globalSections = ref([]);
const validationErrors = ref({});
const isSubmitting = ref(false);
const isLoading = ref(true);

const countryOptions = [
  { value: "Беларусь", label: "Беларусь" },
  { value: "Россия", label: "Россия" },
  { value: "Казахстан", label: "Казахстан" },
  { value: "Украина", label: "Украина" },
  { value: "Польша", label: "Польша" },
  { value: "Литва", label: "Литва" },
  { value: "Латвия", label: "Латвия" },
  { value: "Германия", label: "Германия" },
  { value: "Китай", label: "Китай" },
  { value: "Другая страна", label: "Другая страна" },
];

const organizationOptions = [
  { value: "БГУ", label: "БГУ" },
  { value: "БГУИР", label: "БГУИР" },
  { value: "БНТУ", label: "БНТУ" },
  { value: "БГЭУ", label: "БГЭУ" },
  { value: "БГПУ", label: "БГПУ" },
  { value: "БГМУ", label: "БГМУ" },
  { value: "ГрГУ имени Янки Купалы", label: "ГрГУ имени Янки Купалы" },
  { value: "ВГУ имени П. М. Машерова", label: "ВГУ имени П. М. Машерова" },
  { value: "ГГУ имени Ф. Скорины", label: "ГГУ имени Ф. Скорины" },
  { value: "Другое", label: "Другое" },
  { value: "Другая организация", label: "Другая организация" },
];

const educationStatusOptions = [
  { value: "Студент", label: "Студент" },
  { value: "Магистрант", label: "Магистрант" },
  { value: "Аспирант", label: "Аспирант" },
  { value: "Соискатель", label: "Соискатель" },
  { value: "Преподаватель", label: "Преподаватель" },
  { value: "Научный сотрудник", label: "Научный сотрудник" },
  { value: "Специалист", label: "Специалист" },
];

const educationFormOptions = [
  { value: "Очное", label: "Очное" },
  { value: "Заочное", label: "Заочное" },
];

const fundingFormOptions = [
  { value: "Бюджетное", label: "Бюджетное" },
  { value: "Платное", label: "Платное" },
];

const degreeOptions = [
  { value: "", label: "Не указывать" },
  { value: "кандидат технических наук", label: "кандидат технических наук" },
  {
    value: "кандидат физико-математических наук",
    label: "кандидат физико-математических наук",
  },
  { value: "кандидат филологических наук", label: "кандидат филологических наук" },
  { value: "кандидат экономических наук", label: "кандидат экономических наук" },
  { value: "кандидат педагогических наук", label: "кандидат педагогических наук" },
  { value: "доктор технических наук", label: "доктор технических наук" },
  {
    value: "доктор физико-математических наук",
    label: "доктор физико-математических наук",
  },
  { value: "доктор филологических наук", label: "доктор филологических наук" },
  { value: "доктор экономических наук", label: "доктор экономических наук" },
  { value: "доктор педагогических наук", label: "доктор педагогических наук" },
];

const academicTitleOptions = [
  { value: "", label: "Не указывать" },
  { value: "доцент", label: "доцент" },
  { value: "профессор", label: "профессор" },
  { value: "старший научный сотрудник", label: "старший научный сотрудник" },
  { value: "ведущий научный сотрудник", label: "ведущий научный сотрудник" },
];

const reviewerScopeOptions = [
  {
    value: "conference",
    label: "Вся конференция",
    description: "Рецензирование всех секций выбранной конференции",
  },
  {
    value: "section",
    label: "Секция этой конференции",
    description: "Рецензирование только выбранной секции конференции",
  },
  {
    value: "global_section",
    label: "Секция во всех конференциях",
    description: "Рецензирование выбранной секции во всех конференциях",
  },
];

function withCurrentOption(options, value) {
  const normalizedValue = String(value || "").trim();
  if (
    !normalizedValue ||
    options.some((option) => option.value === normalizedValue)
  ) {
    return options;
  }

  return [{ value: normalizedValue, label: normalizedValue }, ...options];
}

const countryDropdownOptions = computed(() =>
  withCurrentOption(countryOptions, form.country),
);
const organizationDropdownOptions = computed(() =>
  withCurrentOption(organizationOptions, form.organization),
);
const educationStatusDropdownOptions = computed(() =>
  withCurrentOption(educationStatusOptions, form.educationStatus),
);
const educationFormDropdownOptions = computed(() =>
  withCurrentOption(educationFormOptions, form.educationForm),
);
const fundingFormDropdownOptions = computed(() =>
  withCurrentOption(fundingFormOptions, form.fundingForm),
);
const degreeDropdownOptions = computed(() =>
  withCurrentOption(degreeOptions, form.degree),
);
const academicTitleDropdownOptions = computed(() =>
  withCurrentOption(academicTitleOptions, form.academicTitle),
);

const applicationTypeLabel = computed(() =>
  typeParam.value === "speaker" ? "докладчика" : "рецензента",
);
const reviewerNeedsSection = computed(
  () =>
    !isSpeaker.value &&
    ["section", "global_section"].includes(form.reviewerScope),
);
const reviewerUsesGlobalSection = computed(
  () => !isSpeaker.value && form.reviewerScope === "global_section",
);
const reviewerUsesConferenceSection = computed(
  () => !isSpeaker.value && form.reviewerScope === "section",
);
const shouldShowSectionField = computed(
  () => isSpeaker.value || reviewerNeedsSection.value,
);
const sectionFieldLabel = computed(() => {
  if (reviewerUsesGlobalSection.value) {
    return "Секция для рецензирования во всех конференциях";
  }

  if (reviewerUsesConferenceSection.value) {
    return "Секция этой конференции";
  }

  return "Секция";
});
const sectionEmptyText = computed(() =>
  reviewerUsesGlobalSection.value
    ? "Секции пока не настроены в справочнике."
    : "У этой конференции пока нет доступных секций.",
);
const sectionRequiredMessage = computed(() =>
  reviewerUsesGlobalSection.value
    ? "Выберите секцию для рецензирования во всех конференциях"
    : "Выберите секцию для рецензирования",
);

const requiredFields = computed(() =>
  isSpeaker.value
    ? [
        "sectionId",
        "lastName",
        "firstName",
        "email",
        "phone",
        "country",
        "organization",
        "reportTitle",
      ]
    : [
        ...(reviewerNeedsSection.value ? ["sectionId"] : []),
        "lastName",
        "firstName",
        "email",
        "phone",
        "country",
        "organization",
      ],
);

const fieldLabels = {
  sectionId: "Секция",
  reviewerScope: "Область рецензирования",
  lastName: "Фамилия",
  firstName: "Имя",
  email: "Email",
  phone: "Телефон",
  country: "Страна",
  organization: "Организация",
  educationStatus: "Статус автора",
  educationForm: "Форма обучения",
  fundingForm: "Форма финансирования",
  reportTitle: "Название доклада",
  additionalInfo: "Дополнительная информация",
};

watch(sectionOptionsForForm, (options) => {
  if (!shouldShowSectionField.value) return;

  const hasSelectedOption = options.some(
    (option) => String(option.value) === String(form.sectionId),
  );

  if ((!form.sectionId || !hasSelectedOption) && options.length > 0) {
    form.sectionId = options[0].value;
  }
});

watch(
  () => form.reviewerScope,
  (scope) => {
    if (isSpeaker.value) return;

    if (scope === "conference") {
      form.sectionId = conferenceSectionOptions.value[0]?.value || "";
      const { sectionId, ...restErrors } = validationErrors.value;
      validationErrors.value = restErrors;
      return;
    }

    const options =
      scope === "global_section"
        ? globalSectionOptions.value
        : conferenceSectionOptions.value;
    form.sectionId = options[0]?.value || "";
    if (form.sectionId) {
      const { sectionId, ...restErrors } = validationErrors.value;
      validationErrors.value = restErrors;
    }
  },
);

watch(isSpeaker, (speaker) => {
  if (speaker && !form.sectionId && sectionOptionsForForm.value.length > 0) {
    form.sectionId = sectionOptionsForForm.value[0].value;
    return;
  }

  if (!speaker) {
    form.sectionId =
      form.reviewerScope === "global_section"
        ? globalSectionOptions.value[0]?.value || ""
        : conferenceSectionOptions.value[0]?.value || "";
  }
});

function fillUserDefaults() {
  const user = auth.user;
  if (!user || typeof user !== "object") {
    if (typeof user === "string") {
      form.email = user;
    }
    return;
  }

  form.firstName = form.firstName || user.firstName || "";
  form.lastName = form.lastName || user.lastName || "";
  form.email = form.email || user.email || "";
  form.phone = form.phone || user.phone || "";
  form.country = form.country || user.country || "";
  form.organization = form.organization || user.organization || "";
}

function normalizeErrorKey(field) {
  return String(field).replace(/_([a-z])/g, (_, char) => char.toUpperCase());
}

function setValidationErrors(errors) {
  if (!errors || typeof errors !== "object") {
    validationErrors.value = {};
    return;
  }

  validationErrors.value = Object.fromEntries(
    Object.entries(errors).map(([field, messages]) => {
      const value = Array.isArray(messages) ? messages[0] : messages;
      const normalizedField = normalizeErrorKey(field);
      const message =
        normalizedField === "sectionId" && !isSpeaker.value
          ? sectionRequiredMessage.value
          : normalizedField === "reviewerScope"
            ? "Выберите область рецензирования"
          : String(value || "");
      return [normalizedField, message];
    }),
  );
}

function getFieldError(field) {
  return validationErrors.value[field] || "";
}

function validateClientSide() {
  const nextErrors = {};

  requiredFields.value.forEach((field) => {
    if (!String(form[field] || "").trim()) {
      nextErrors[field] =
        field === "sectionId" && reviewerNeedsSection.value
          ? sectionRequiredMessage.value
          : `${fieldLabels[field]}: заполните поле`;
    }
  });

  validationErrors.value = nextErrors;
  return Object.keys(nextErrors).length === 0;
}

function trimmedOrNull(value) {
  const trimmedValue = String(value || "").trim();
  return trimmedValue || null;
}

function addOptionalText(payload, field, value) {
  const trimmedValue = String(value || "").trim();
  if (trimmedValue) {
    payload[field] = trimmedValue;
  }
}

function handleFileChange(event) {
  const file = event.target.files?.[0] || null;

  if (!file) {
    selectedFile.value = null;
    return;
  }

  if (!validateUploadFiles([file])) {
    selectedFile.value = null;
    event.target.value = "";
    validationErrors.value = {
      ...validationErrors.value,
      fileId: ALLOWED_UPLOAD_MESSAGE,
    };
    return;
  }

  selectedFile.value = file;
  const { fileId, ...restErrors } = validationErrors.value;
  validationErrors.value = restErrors;
}

function buildPayload(fileId = null) {
  const payload = {
    type: typeParam.value,
    lastName: form.lastName.trim(),
    firstName: form.firstName.trim(),
    middleName: trimmedOrNull(form.middleName),
    email: form.email.trim(),
    phone: form.phone.trim(),
    country: form.country.trim(),
    organization: form.organization.trim(),
    additionalInfo: trimmedOrNull(form.additionalInfo),
  };

  if (isSpeaker.value) {
    Object.assign(payload, {
      sectionId: form.sectionId,
      reportTitle: form.reportTitle.trim(),
      commentForReviewer: trimmedOrNull(form.commentForReviewer),
    });
    addOptionalText(payload, "educationStatus", form.educationStatus);
    addOptionalText(payload, "educationForm", form.educationForm);
    addOptionalText(payload, "fundingForm", form.fundingForm);

    if (fileId) {
      payload.fileId = fileId;
    }

    return payload;
  }

  const reviewerScope = ["section", "global_section"].includes(
    form.reviewerScope,
  )
    ? form.reviewerScope
    : "conference";
  Object.assign(payload, {
    reviewerScope,
    degree: form.degree.trim() || null,
    academicTitle: form.academicTitle.trim() || null,
  });

  if (reviewerScope === "conference") {
    const sectionId = form.sectionId || conferenceSectionOptions.value[0]?.value;
    if (sectionId) {
      payload.sectionId = sectionId;
    }
  } else {
    payload.sectionId = form.sectionId;
  }

  return payload;
}

async function submitApplication() {
  if (!auth.isAuthenticated) {
    showToast("Войдите, чтобы подать заявку");
    router.push("/login");
    return;
  }

  await conferenceStore.loadApplicationsForConference(conferenceId.value);
  if (blockingApplication.value) {
    showToast(
      "Вы уже подали заявку на эту конференцию или не можете быть докладчиком и рецензентом в одной конференции",
      5000,
    );
    return;
  }

  if (!validateClientSide()) return;

  isSubmitting.value = true;
  validationErrors.value = {};

  try {
    let uploadedFileId = null;

    if (isSpeaker.value && selectedFile.value) {
      const uploadedFile = await fileStore.uploadSingleFile(selectedFile.value);
      uploadedFileId = uploadedFile?.id || uploadedFile?.contentId || null;

      if (!uploadedFileId) {
        throw new Error("Не удалось получить идентификатор файла");
      }
    }

    await createConferenceApplication(
      conferenceId.value,
      buildPayload(uploadedFileId),
    );
    await Promise.allSettled([
      conferenceStore.loadConferences(),
      conferenceStore.loadApplicationsForConference(conferenceId.value),
      auth.refreshProfile(),
    ]);
    showToast("Заявка отправлена на рассмотрение");
    router.push("/conferences");
  } catch (error) {
    const status = Number(error?.status || 0);

    if (status === 409) {
      showToast(
        "Вы уже подали заявку на эту конференцию или не можете быть докладчиком и рецензентом в одной конференции",
        6000,
      );
      return;
    }

    if (status === 422) {
      setValidationErrors(error?.errors || error?.payload?.errors);
      showToast("Проверьте поля формы", 4000);
      return;
    }

    showToast(getApiErrorMessage(error, "Не удалось отправить заявку"));
  } finally {
    isSubmitting.value = false;
  }
}

function goBack() {
  router.push("/conferences");
}

function uniqueSections(sections) {
  const knownIds = new Set();
  return sections.filter((section) => {
    const id = section?.id;
    if (id === undefined || id === null || id === "") return false;

    const key = String(id);
    if (knownIds.has(key)) return false;
    knownIds.add(key);
    return true;
  });
}

async function loadGlobalSections() {
  if (isSpeaker.value) return;

  try {
    const dictionary = await getApplicationDictionaries();
    globalSections.value = uniqueSections([
      ...(dictionary.sections || []),
      ...Object.values(dictionary.sectionsByTopic || {}).flat(),
    ]);
  } catch (error) {
    globalSections.value = [];
    console.error("loadGlobalSections error:", error);
  }
}

onMounted(async () => {
  if (!["speaker", "reviewer"].includes(route.params.type)) {
    router.replace("/conferences");
    return;
  }

  if (!auth.isAuthenticated) {
    const user = await auth.bootstrap();
    if (!user) {
      showToast("Войдите, чтобы подать заявку");
      router.replace("/login");
      return;
    }
  }

  if (auth.isAdmin) {
    showToast("Администратор управляет заявками в админ-разделе");
    router.replace("/conferences");
    return;
  }

  isLoading.value = true;
  await Promise.allSettled([
    conferenceStore.loadConferences(),
    loadGlobalSections(),
  ]);
  await Promise.allSettled([
    conferenceStore.loadConference(conferenceId.value),
    conferenceStore.loadApplicationsForConference(conferenceId.value),
  ]);

  fillUserDefaults();
  if (!form.sectionId && sectionOptionsForForm.value.length > 0) {
    form.sectionId = sectionOptionsForForm.value[0].value;
  }
  isLoading.value = false;
});
</script>

<template>
  <div class="application-page">
    <div class="application-wrapper">
      <div class="application-header">
        <button type="button" class="back-button" @click="goBack">
          Назад
        </button>
        <div>
          <h1 class="page-title application-title">{{ pageTitle }}</h1>
          <p class="page-lead application-lead">{{ pageLead }}</p>
        </div>
      </div>

      <div v-if="isLoading" class="application-card application-state">
        Загрузка формы...
      </div>

      <div v-else-if="!conference" class="application-card application-state">
        Конференция не найдена
      </div>

      <div v-else class="application-card">
        <div v-if="blockingApplication" class="application-alert">
          Вы уже подали заявку на эту конференцию или не можете быть докладчиком
          и рецензентом в одной конференции
        </div>

        <form class="application-form" @submit.prevent="submitApplication">
          <div class="form-grid">
            <div v-if="!isSpeaker" class="form-field form-field--full">
              <label class="form-label">Область рецензирования</label>
              <div class="reviewer-scope-grid" role="radiogroup">
                <label
                  v-for="option in reviewerScopeOptions"
                  :key="option.value"
                  class="reviewer-scope-card"
                  :class="{
                    'reviewer-scope-card--active':
                      form.reviewerScope === option.value,
                  }"
                >
                  <input
                    v-model="form.reviewerScope"
                    type="radio"
                    name="reviewerScope"
                    :value="option.value"
                  />
                  <span class="reviewer-scope-title">{{ option.label }}</span>
                  <span class="reviewer-scope-description">
                    {{ option.description }}
                  </span>
                </label>
              </div>
              <span v-if="getFieldError('reviewerScope')" class="form-error">
                {{ getFieldError("reviewerScope") }}
              </span>
            </div>

            <div v-if="shouldShowSectionField" class="form-field form-field--full">
              <label class="form-label">{{ sectionFieldLabel }}</label>
              <SelectDropdown
                v-if="sectionOptionsForForm.length > 0"
                v-model="form.sectionId"
                :options="sectionOptionsForForm"
                :label="sectionFieldLabel"
              />
              <p
                v-else
                class="form-help form-help--warning"
              >
                {{ sectionEmptyText }}
              </p>
              <span v-if="getFieldError('sectionId')" class="form-error">
                {{ getFieldError("sectionId") }}
              </span>
            </div>

            <div class="form-field">
              <label class="form-label">Фамилия</label>
              <input v-model="form.lastName" class="form-input" type="text" />
              <span v-if="getFieldError('lastName')" class="form-error">
                {{ getFieldError("lastName") }}
              </span>
            </div>

            <div class="form-field">
              <label class="form-label">Имя</label>
              <input v-model="form.firstName" class="form-input" type="text" />
              <span v-if="getFieldError('firstName')" class="form-error">
                {{ getFieldError("firstName") }}
              </span>
            </div>

            <div class="form-field">
              <label class="form-label">Отчество</label>
              <input v-model="form.middleName" class="form-input" type="text" />
              <span v-if="getFieldError('middleName')" class="form-error">
                {{ getFieldError("middleName") }}
              </span>
            </div>

            <div class="form-field">
              <label class="form-label">Email</label>
              <input v-model="form.email" class="form-input" type="email" />
              <span v-if="getFieldError('email')" class="form-error">
                {{ getFieldError("email") }}
              </span>
            </div>

            <div class="form-field">
              <label class="form-label">Телефон</label>
              <input v-model="form.phone" class="form-input" type="tel" />
              <span v-if="getFieldError('phone')" class="form-error">
                {{ getFieldError("phone") }}
              </span>
            </div>

            <div class="form-field">
              <label class="form-label">Страна</label>
              <SelectDropdown
                v-model="form.country"
                :options="countryDropdownOptions"
                label="Выберите страну"
              />
              <span v-if="getFieldError('country')" class="form-error">
                {{ getFieldError("country") }}
              </span>
            </div>

            <div class="form-field form-field--full">
              <label class="form-label">Организация</label>
              <SelectDropdown
                v-model="form.organization"
                :options="organizationDropdownOptions"
                label="Выберите организацию"
              />
              <span v-if="getFieldError('organization')" class="form-error">
                {{ getFieldError("organization") }}
              </span>
            </div>

            <template v-if="isSpeaker">
              <div class="form-field">
                <label class="form-label">Статус автора</label>
                <SelectDropdown
                  v-model="form.educationStatus"
                  :options="educationStatusDropdownOptions"
                  label="Выберите статус"
                />
                <span
                  v-if="getFieldError('educationStatus')"
                  class="form-error"
                >
                  {{ getFieldError("educationStatus") }}
                </span>
              </div>

              <div class="form-field">
                <label class="form-label">Форма обучения</label>
                <SelectDropdown
                  v-model="form.educationForm"
                  :options="educationFormDropdownOptions"
                  label="Выберите форму обучения"
                />
                <span
                  v-if="getFieldError('educationForm')"
                  class="form-error"
                >
                  {{ getFieldError("educationForm") }}
                </span>
              </div>

              <div class="form-field">
                <label class="form-label">Форма финансирования</label>
                <SelectDropdown
                  v-model="form.fundingForm"
                  :options="fundingFormDropdownOptions"
                  label="Выберите форму финансирования"
                />
                <span
                  v-if="getFieldError('fundingForm')"
                  class="form-error"
                >
                  {{ getFieldError("fundingForm") }}
                </span>
              </div>

              <div class="form-field form-field--full">
                <label class="form-label">Название доклада</label>
                <input
                  v-model="form.reportTitle"
                  class="form-input"
                  type="text"
                />
                <span v-if="getFieldError('reportTitle')" class="form-error">
                  {{ getFieldError("reportTitle") }}
                </span>
              </div>

              <div class="form-field form-field--full">
                <label class="form-label">Комментарий для рецензента</label>
                <textarea
                  v-model="form.commentForReviewer"
                  class="form-textarea"
                  rows="4"
                ></textarea>
                <span
                  v-if="getFieldError('commentForReviewer')"
                  class="form-error"
                >
                  {{ getFieldError("commentForReviewer") }}
                </span>
              </div>

              <div class="form-field form-field--full">
                <label class="form-label">Файл доклада</label>
                <input
                  class="form-input"
                  type="file"
                  :accept="ALLOWED_UPLOAD_ACCEPT"
                  @change="handleFileChange"
                />
                <span v-if="selectedFile" class="form-file-name">
                  {{ selectedFile.name }}
                </span>
                <span v-if="getFieldError('fileId')" class="form-error">
                  {{ getFieldError("fileId") }}
                </span>
              </div>
            </template>

            <template v-else>
              <div class="form-field">
                <label class="form-label">Степень</label>
                <SelectDropdown
                  v-model="form.degree"
                  :options="degreeDropdownOptions"
                  label="Выберите степень"
                />
                <span v-if="getFieldError('degree')" class="form-error">
                  {{ getFieldError("degree") }}
                </span>
              </div>

              <div class="form-field">
                <label class="form-label">Звание</label>
                <SelectDropdown
                  v-model="form.academicTitle"
                  :options="academicTitleDropdownOptions"
                  label="Выберите звание"
                />
                <span
                  v-if="getFieldError('academicTitle')"
                  class="form-error"
                >
                  {{ getFieldError("academicTitle") }}
                </span>
              </div>
            </template>

            <div class="form-field form-field--full">
              <label class="form-label">
                {{
                  isSpeaker
                    ? "Дополнительная информация"
                    : "Дополнительная информация / научные интересы / опыт рецензирования"
                }}
              </label>
              <textarea
                v-model="form.additionalInfo"
                class="form-textarea"
                rows="5"
              ></textarea>
              <span v-if="getFieldError('additionalInfo')" class="form-error">
                {{ getFieldError("additionalInfo") }}
              </span>
            </div>
          </div>

          <div class="form-actions">
            <button type="button" class="secondary-button" @click="goBack">
              Отмена
            </button>
            <button
              type="submit"
              class="primary-button"
              :disabled="isSubmitting || Boolean(blockingApplication)"
            >
              {{
                isSubmitting
                  ? "Отправляем..."
                  : `Отправить заявку ${applicationTypeLabel}`
              }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.application-page {
  min-height: calc(100vh - 140px);
  background-color: var(--background-color);
  padding: 40px 15px;
}

.application-wrapper {
  max-width: 920px;
  margin: 0 auto;
}

.application-header {
  display: flex;
  align-items: flex-start;
  gap: 18px;
  margin-bottom: 24px;
}

.application-title {
  margin-bottom: 8px;
  text-align: left;
}

.application-lead {
  margin: 0;
  text-align: left;
}

.back-button,
.secondary-button,
.primary-button {
  border: none;
  border-radius: 10px;
  font-family: "Poppins", sans-serif;
  font-weight: 700;
  cursor: pointer;
  transition:
    opacity 0.2s ease,
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.back-button {
  padding: 10px 14px;
  background: var(--border-color);
  color: var(--text-color);
}

.application-card {
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: var(--card-background-color);
  box-shadow: 0 8px 28px rgba(20, 24, 40, 0.08);
  padding: 24px;
}

.application-state {
  color: var(--light-text-color);
  font-family: "Roboto", sans-serif;
  text-align: center;
}

.application-alert {
  margin-bottom: 18px;
  border: 1px solid rgba(245, 158, 11, 0.24);
  border-radius: 10px;
  background: rgba(245, 158, 11, 0.12);
  color: #b45309;
  padding: 12px 14px;
  font-family: "Roboto", sans-serif;
  font-weight: 700;
}

.application-form {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-field--full {
  grid-column: 1 / -1;
}

.reviewer-scope-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.reviewer-scope-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 112px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: rgba(74, 105, 226, 0.04);
  padding: 12px;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease,
    box-shadow 0.2s ease;
}

.reviewer-scope-card:hover,
.reviewer-scope-card--active {
  border-color: rgba(74, 105, 226, 0.55);
  background: rgba(74, 105, 226, 0.1);
  box-shadow: 0 8px 18px rgba(74, 105, 226, 0.12);
}

.reviewer-scope-card input {
  align-self: flex-start;
  margin: 0;
}

.reviewer-scope-title {
  color: var(--text-color);
  font-family: "Poppins", sans-serif;
  font-size: 0.95rem;
  font-weight: 700;
}

.reviewer-scope-description {
  color: var(--light-text-color);
  font-family: "Roboto", sans-serif;
  font-size: 0.82rem;
  line-height: 1.35;
}

.form-label {
  color: var(--text-color);
  font-family: "Roboto", sans-serif;
  font-size: 0.9rem;
  font-weight: 700;
}

.form-input,
.form-textarea {
  width: 100%;
  box-sizing: border-box;
  border: 2px solid var(--border-color);
  border-radius: 10px;
  background-color: var(--card-background-color);
  color: var(--text-color);
  font-family: "Roboto", sans-serif;
  font-size: 0.95rem;
  padding: 12px 14px;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(74, 105, 226, 0.1);
}

.form-textarea {
  min-height: 110px;
  resize: vertical;
}

.form-error {
  color: #dc2626;
  font-family: "Roboto", sans-serif;
  font-size: 0.82rem;
}

.form-file-name {
  color: var(--light-text-color);
  font-family: "Roboto", sans-serif;
  font-size: 0.86rem;
  word-break: break-word;
}

.form-help {
  margin: 0;
  color: var(--light-text-color);
  font-family: "Roboto", sans-serif;
  font-size: 0.86rem;
}

.form-help--warning {
  color: #b45309;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 20px;
  border-top: 1px solid var(--border-color);
}

.secondary-button,
.primary-button {
  padding: 12px 18px;
  font-size: 0.95rem;
}

.secondary-button {
  background: var(--border-color);
  color: var(--text-color);
}

.primary-button {
  background: var(--primary-color);
  color: #fff;
}

.back-button:hover,
.secondary-button:hover,
.primary-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(74, 105, 226, 0.2);
}

.primary-button:disabled,
.secondary-button:disabled {
  cursor: not-allowed;
  opacity: 0.68;
  transform: none;
  box-shadow: none;
}

@media (max-width: 700px) {
  .application-header,
  .form-actions {
    flex-direction: column;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .reviewer-scope-grid {
    grid-template-columns: 1fr;
  }

  .back-button,
  .secondary-button,
  .primary-button {
    width: 100%;
  }
}
</style>
