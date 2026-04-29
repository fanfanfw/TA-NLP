<template>
  <footer p="y15 x15" flex="~ col gap4">
    <div flex="~ row gap2" items-center my2>
      <img src="/movies-sm.webp" width="25" height="25" alt="Logo">
      <div text-xl>
        Nuxt Movies
      </div>
    </div>
    <div flex gap4 items-center>
      <ExternalLinks
        :links="{
          twitter_id: 'nuxt_js',
          github_id: 'nuxt/movies',
        }"
      />

      <LanguageSwitcher />
    </div>
  </footer>
</template>
