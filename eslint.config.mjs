import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import hooks from 'eslint-plugin-react-hooks'

export default tseslint.config(
  { ignores: ['node_modules/**', 'out/**', 'dist/**', 'test-results/**', 'playwright-report/**', '.agents/**', '.cbx/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/renderer/src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': hooks },
    rules: {
      ...hooks.configs.recommended.rules,
      'no-restricted-imports': ['error', { patterns: [
        { group: ['electron', 'node:*', '**/main/**', '**/preload/**', '**/core/**'], message: 'Renderer code uses the typed preload API; it cannot import privileged or domain implementations.' }
      ] }]
    }
  },
  {
    files: ['src/core/**/*.ts', 'src/shared/**/*.ts'],
    rules: { 'no-restricted-imports': ['error', { patterns: [
      { group: ['electron', 'node:*', 'react', 'react-dom', '**/main/**', '**/preload/**', '**/renderer/**'], message: 'Core and shared code must remain platform-independent.' }
    ] }] }
  },
  {
    files: ['src/preload/**/*.ts'],
    rules: { 'no-restricted-imports': ['error', { patterns: [
      { group: ['node:*', '**/main/**', '**/core/**', '**/renderer/**'], message: 'Preload only translates shared contracts to Electron IPC.' }
    ] }] }
  }
)
