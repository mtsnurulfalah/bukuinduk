<template>
  <RouterView v-slot="{ Component, route }">
    <Transition name="page" mode="out-in">
      <component :is="Component" :key="route.path" />
    </Transition>
  </RouterView>
  <Toaster position="top-right" rich-colors close-button />
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>
