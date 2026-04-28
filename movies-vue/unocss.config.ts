import {
  defineConfig,
  presetAttributify,
  presetIcons,
  presetTypography,
  presetUno,
  transformerDirectives,
  transformerVariantGroup,
} from 'unocss'

// @unocss-include

export default defineConfig({
  shortcuts: [
    ['n-link', 'op50 hover:(op100 text-primary) transition'],
    ['n-link-text', 'n-link underline'],
    ['n-tab', 'text-xl tracking-wide uppercase p3 border-b-2 border-transparent op20 transition'],
    ['n-tab-active', 'border-current op100'],
    ['border-base', 'border-gray-400/20'],
  ],
  rules: [
    [/^view-transition-([\w-]+)$/, ([, name]) => ({ 'view-transition-name': name })],
  ],
  theme: {
    colors: {
      primary: '#40c1ad',
    },
    fontFamily: {
      sans: 'DM Sans, ui-sans-serif, system-ui, sans-serif',
      serif: 'DM Serif Display, ui-serif, Georgia, serif',
      mono: 'DM Mono, ui-monospace, SFMono-Regular, monospace',
    },
  },
  presets: [
    presetUno(),
    presetAttributify(),
    presetIcons({
      scale: 1.2,
    }),
    presetTypography(),
  ],
  transformers: [
    transformerDirectives(),
    transformerVariantGroup(),
  ],
})
