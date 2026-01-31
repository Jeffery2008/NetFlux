/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#165DFF',
        speed: '#165DFF',
        delay: '#00B42A',
        fast: '#FF7D00',
        isp: '#6600CC',
        factory: '#E60012',
        success: '#00B42A',
        danger: '#F53F3F',
        warning: '#FF7D00'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Microsoft YaHei', 'sans-serif']
      }
    }
  },
  plugins: []
};
