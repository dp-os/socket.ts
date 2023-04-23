import { Socket } from '../../src';

const socket = new Socket({
    url: 'ws://localhost:5173',
    protocols: 'vite-hmr'
});

function workerPlugin(socket: Socket) {
    function handle(type: string, data: any) {
        switch (type) {
            case 'send':
                socket.send(data);
                break;
            case 'state':
                postMessage({
                    type,
                    data
                });
                break;
            case 'message':
                postMessage({
                    type,
                    data
                });
                break;
        }
    }
    addEventListener('message', (ev) => {
        handle(ev.data.type, ev.data.data);
    });
    socket.subscribeState((state) => {
        handle('state', state);
    })
    socket.subscribeMessage((ev) => {
        handle('message', ev.data);
    })
}

workerPlugin(socket);

socket.connect();