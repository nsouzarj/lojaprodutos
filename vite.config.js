import { defineConfig } from 'vite';

export default defineConfig({
    // Define a base como a subpasta onde o projeto será hospedado no Apache
    base: '/lojaprodutos/',
    build: {
        outDir: 'dist',
    },
    server: {
        host: true
    }
});
