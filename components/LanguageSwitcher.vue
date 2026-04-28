<script setup>
const { locale, locales, setLocale } = useI18n()

const availableLocales = computed(() => {
  return (locales.value)
})

function updateLocale(event) {
  setLocale(event.target.value)
  window.location.reload()
}

onMounted(() => {
  const langSwitcher = document.querySelector('#langSwitcher')
  langSwitcher.value = locale.value
})
</script>

<template>
  <div flex gap2 items-center mt-5>
    Language:
    <select id="langSwitcher" class="ui-control language-select" @change="updateLocale">
      <option v-for="loc in availableLocales" :key="loc.code" :value="loc.code" p-1>
        {{ loc.name }}
      </option>
    </select>
  </div>
</template>

<style scoped>
.language-select {
  min-height: 34px;
  padding: 4px 10px;
  font-size: 0.875rem;
}
</style>
