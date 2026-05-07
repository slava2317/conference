<template>
  <div class="card">
    <div class="card-head">
      <div class="card-icon" v-if="icon" v-html="icon"></div>
      <h4>{{ title }}</h4>
    </div>
    <div class="card-body">
      <slot />
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  icon: { type: String, required: false },
});
</script>

<style scoped>
.card {
  padding: 18px;
  border-radius: 14px;
  background: var(--panel);
  border: 1px solid var(--border-color);
  box-shadow: 0 10px 24px rgba(20, 24, 40, 0.06);
}
.card-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}
.card-icon {
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: linear-gradient(
    135deg,
    rgba(63, 102, 200, 0.12),
    rgba(247, 178, 103, 0.12)
  );
}
.card-icon svg {
  width: 20px;
  height: 20px;
  fill: var(--primary);
}
.card-body {
  color: var(--muted);
  font-size: 0.95rem;
  line-height: 1.65;
}
</style>
