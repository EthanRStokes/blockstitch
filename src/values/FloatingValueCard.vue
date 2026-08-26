<script setup lang="ts">
import type { FloatingValueLike } from '../canvas/host';
import ValueBlock from './ValueBlock.vue';

defineProps<{ floatingValue: FloatingValueLike }>();
</script>

<template>
  <div class="value-floating-card" :data-floating-id="floatingValue.id">
    <ValueBlock :location="{ kind: 'Floating', floating_id: floatingValue.id, path: [] }" :value="floatingValue.value" />
  </div>
</template>
