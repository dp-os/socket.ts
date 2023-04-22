import { defineConfig } from 'vite';
import { simplePlugin } from './demo/simple-server';

export default defineConfig({
    plugins: [
        simplePlugin
    ]
})
