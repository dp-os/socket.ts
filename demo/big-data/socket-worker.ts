import { Socket } from '../../src';

const socket = new Socket({
    url: 'ws://localhost:5173',
    protocols: 'vite-hmr'
});

socket.connect();