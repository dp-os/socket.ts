import { type Socket } from '../socket';
import { SocketState, type SocketBridge } from '../socket';

enum ActionType {
    send = 'send',
    state = 'state',
    data = 'data'
}
export class WorkerSocketBridge implements SocketBridge {
    private _worker: Worker;
    public constructor (worker: Worker) {
        this._worker = worker;
        worker.addEventListener('message', (ev) => {
            const type = ev.data.type;
            switch (type) {
                case ActionType.state:
                    switch (ev.data.data) {
                        case SocketState.open:
                            this.onOpen && this.onOpen(new Event('onopen'));
                            break;
                        case SocketState.error:
                            this.onError && this.onError(new Event('onerror'));
                            break;
                    }
                    break;
                case ActionType.data:
                    this.onMessage && this.onMessage(new MessageEvent('message', {
                        data: ev.data.data,
                    }));
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
                reason,
            });
            this.onClose(event);
        }
    }
    public send(data: any): void {
        this._worker.postMessage({
            type: 'send',
            data,
        });
    }
}


export function workerPlugin(socket: Socket) {
    const isWorker = (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope);
    function handle(type: ActionType, data: any) {
        switch (type) {
            case ActionType.send:
                socket.send(data);
                break;
            case ActionType.state:
                postMessage({
                    type,
                    data,
                });
                break;
            case ActionType.data:
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
        handle(ActionType.state, state);
    });
    socket.subscribeData((data) => {
        handle(ActionType.data, data);
    });
}
