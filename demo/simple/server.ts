import dayjs from 'dayjs';
import { Plugin, WebSocket } from 'vite';
import { EVENT_NAME } from './config';

export const simplePlugin: Plugin = {
    name: 'socket-simple',
    configureServer({ ws }) {
        ws.on('connection', (client) => {
            serverTime(client);
        });
    }
}

function serverTime(client: WebSocket) {
    let timer: NodeJS.Timer | null = null;
    const unsubscribe = () => {
        if (timer) {
            clearInterval(timer);
            timer = null;
        }
    }
    const send = () => {
        const date = dayjs().format('YYYY-MM-DD HH:mm:ss');
        client.send(JSON.stringify({ event: EVENT_NAME, data: { date } }));
    }
    const subscribe = (subscribe: boolean) => {
        if (subscribe) {
            if (timer) return;
            timer = setInterval(send, 1000);
            send();
        } else {
            unsubscribe();
        }
    }
    client.on('close', () => {
        unsubscribe();
    });
    client.on('message', (ev) => {
        const result = JSON.parse(ev.toString());
        if (result.event === EVENT_NAME) {
            subscribe(result.data);
        }
    })
}