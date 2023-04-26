import { defineConfig } from 'vite';
import { simplePlugin } from './demo/simple/server';
import { workerPlugin } from './demo/worker/server';
import { visiblePlugin } from './demo/visible/server';

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
        visiblePlugin,
    ]
})
