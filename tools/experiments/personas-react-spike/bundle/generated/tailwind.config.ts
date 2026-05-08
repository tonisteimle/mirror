import type { Config } from 'tailwindcss'
import typography from '@tailwindcss/typography'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#000',
        white: '#fff',
        yellow: '#FDE70E',
        soft: '#F4F4F4',
        muted: '#888',
      },
      borderColor: {
        hairline: '#e5e5e5',
      },
      maxWidth: {
        content: '1280px',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'system-ui', 'sans-serif'],
        serif: ['Spectral', 'serif'],
      },
    },
  },
  plugins: [typography],
}

export default config
