import { type Socket } from '../socket';

export function workerPlugin(socket: Socket) {
    const isWorker = (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope);
    function handle(type: string, data: any) {
        switch (type) {
            case 'send':
                socket.send(data);
                break;
            case 'state':
                postMessage({
                    type,
                    data,
                });
                break;
            case 'message':
                postMessage({
                    type,
                    data,
                });
                break;
        }
    }
    if (!isWorker) return;
    addEventListener('message', (ev) => {
        handle(ev.data.type, ev.data.data);
    });
    socket.subscribeState((state) => {
        handle('state', state);
    });
    socket.subscribeMessage((ev) => {
        handle('message', ev);
    });
}
