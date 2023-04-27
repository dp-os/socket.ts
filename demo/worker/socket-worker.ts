import { Socket, workerSyncToWindowPlugin } from '../../src';

const socket = new Socket({
    url: 'ws://localhost:5173',
    protocols: 'vite-hmr',
    plugins: [
        workerSyncToWindowPlugin()
    ]
});

socket.connect();