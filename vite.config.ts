import { defineConfig } from 'vite';
import { simplePlugin } from './demo/simple/server';
import { workerPlugin } from './demo/worker/server';
import { BigDataPlugin } from './demo/big-data/server';

export default defineConfig({
    test: {
        globals: true,
        environment: 'happy-dom',
        coverage: {
            reporter: ['lcov', 'html']
        }
    },
    plugins: [
        simplePlugin,
        workerPlugin,
        BigDataPlugin
    ],
    resolve: {
        alias: {
            'vue': 'vue/dist/vue.js'
        }
    }
})
