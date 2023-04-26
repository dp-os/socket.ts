import { Socket } from '../../src';

const socket = new Socket({
    url: `ws://${location.hostname}:${location.port}`,
    protocols: 'vite-hmr'
});

socket.connect();