import { Socket, workerSyncToWindowPlugin } from '../../src';

const socket = new Socket({
    url: `ws://${location.hostname}:${location.port}`,
    protocols: 'vite-hmr',
    plugins: [
        workerSyncToWindowPlugin
    ]
});

socket.connect();