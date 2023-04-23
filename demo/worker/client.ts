// @ts-ignore
import SocketWorker from './socket-worker?worker';
import { Socket, SocketState, SocketBridge } from '../../src';

class WorkerSocket implements SocketBridge {
    private _worker: Worker;
    public constructor (worker: Worker) {
        this._worker = worker;
        worker.addEventListener('message', (ev) => {
            const type = ev.data.type;
            switch (type) {
                case 'state':
                    switch (ev.data.data) {
                        case SocketState.open:
                            this.onOpen && this.onOpen(new Event('onopen'))
                            break;
                        case SocketState.error:
                            this.onError && this.onError(new Event('onerror'))
                            break;
                    }
                    break;
                case 'message':
                    this.onMessage && this.onMessage(new MessageEvent('message', {
                        data: ev.data.data
                    }))
                    break;
            }
        })
    }
    public onOpen: SocketBridge['onOpen'] = null;
    public onMessage: SocketBridge['onMessage'] = null;
    public onClose: SocketBridge['onClose'] = null;
    public onError: SocketBridge['onError'] = null;
    public close(code = 1000, reason?: string) {
        this._worker.terminate();
        if (this.onClose) {
            const event = new CloseEvent('close', {
                code,
                reason
            });
            this.onClose(event);
        }
    }
    public send(data: any): void {
        console.log('>> send', data)
        this._worker.postMessage({
            type: 'send',
            data
        });
    }
}

const socket = new Socket({
    createSocket() {
        return new WorkerSocket(new SocketWorker());
    },
})

function initConnect() {
    const connectEl = document.getElementById('connect')!;
    const disconnectEl = document.getElementById('disconnect')!;

    connectEl.onclick = () => {
        socket.connect()
    }
    disconnectEl.onclick = () => {
        socket.disconnect()
    }
}

function initState() {
    const stateEl = document.getElementById('state')!;
    socket.subscribeState((state) => {
        let text = '';
        console.log('>> state', state);
        switch (state) {
            case SocketState.stateless:
                text = 'Not connected';
                break;
            case SocketState.pending:
                text = 'Connecting';
                break;
            case SocketState.open:
                text = 'Successfully connected';
                break;
            case SocketState.close:
                text = 'Connection closed';
                break;
            case SocketState.error:
                text = 'Connection error';
                break;
        }
        stateEl.innerText = text;
    })
}

function initTime() {
    const timeEl = document.getElementById('time')!;

    socket.subscribeMessage((ev) => {
        const result = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data;
        if (result.event === 'server-time') {
            timeEl.innerText = result.data.date;
        }
    });
}
export function initSubscribe() {
    const subscribeEl = document.getElementById('subscribe')!;
    const unsubscribe = document.getElementById('unsubscribe')!;

    subscribeEl.onclick = () => {
        socket.send({
            type: 'custom',
            event: 'worker-time',
            data: true
        })
    }
    unsubscribe.onclick = () => {
        socket.send({
            type: 'custom',
            event: 'worker-time',
            data: false
        })
    }

}
initConnect();
initState();
initTime();
initSubscribe()
