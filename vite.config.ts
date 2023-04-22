import { defineConfig, WebSocketServer, WebSocket } from 'vite';
import dayjs from 'dayjs';

export default defineConfig({
    plugins: [
        {
            name: 'socket-mock',
            configureServer({ ws }) {
                ws.on('connection', (client) => {
                    serverTime(ws, client);
                });
            }
        }
    ]
})


export function serverTime(ws: WebSocketServer, client: WebSocket) {
    let timer: NodeJS.Timer | null = null;
    const unsubscribe = () => {
        if (timer) {
            clearInterval(timer);
            timer = null;
        }
    }
    const subscribe = (subscribe: boolean) => {
        if (subscribe) {
            if (timer) return;
            timer = setInterval(() => {
                const date = dayjs().format('YYYY-MM-DD HH:mm:ss');
                ws.send('time', { date });
            })
        } else {
            unsubscribe();
        }
    }
    client.on('close', () => {
        unsubscribe();
        ws.off('server-time', subscribe);
    });
    ws.on('server-time', subscribe);
}