import { type Socket } from '../socket';
import { SocketState, type SocketBridge } from '../socket';

enum UIActionType {
    send = 'send',
    refresh = 'refresh'
}
enum WorkerActionType {
    state = 'state',
    message = 'message'
}

export class WorkerSocketBridge implements SocketBridge {
    private _worker: Worker;
    private _timer: NodeJS.Timeout | null = null;
    private _pingTime = Date.now();
    public constructor(worker: Worker) {
        this._worker = worker;
        worker.addEventListener('message', (ev) => {
            const type = ev.data.type;
            switch (type) {
                case WorkerActionType.state:
                    switch (ev.data.data) {
                        case SocketState.open:
                            this.onOpen && this.onOpen(new Event('onopen'));
                            break;
                        case SocketState.error:
                            this.onError && this.onError(new Event('onerror'));
                            break;
                    }
                    break;
                case WorkerActionType.message:
                    ev.data.data.forEach((item: any) => {
                        this.onMessage && this.onMessage(new MessageEvent('message', {
                            data: item,
                        }));
                    })
                    break;
            }
        })
        this._ping = this._ping.bind(this);
        this._ping();
    }
    private _ping() {
        const now = Date.now();
        const interval = now - this._pingTime;
        this._worker.postMessage({
            type: UIActionType.refresh,
            data: {
                interval
            }
        });
        this._pingTime = now;
        this._timer = setTimeout(this._ping, 20);
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
        if (this._timer) {
            clearTimeout(this._timer);
            this._timer = null;
        }
    }
    public send(data: any): void {
        this._worker.postMessage({
            type: UIActionType.send,
            data,
        });
    }
}


export function workerPlugin(socket: Socket) {
    const isWorker = (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope);
    const dataArr: any[] = [];
    const sendData = (interval: number) => {
        if (interval < 200) {
            while (dataArr.length) {
                const sendArr = dataArr.splice(0, 10);
                if (sendArr.length) {
                    postMessage({
                        type: WorkerActionType.message,
                        data: sendArr,
                    });
                    break;
                }
            }
        }

    }
    function handle(type: UIActionType | WorkerActionType, data: any) {
        switch (type) {
            case UIActionType.send:
                socket.send(data);
                break;
            case UIActionType.refresh:

                sendData(data.interval);
                break;
            case WorkerActionType.state:
                postMessage({
                    type,
                    data,
                });
                break;
            case WorkerActionType.message:
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
    socket.stateEvent.listen((state) => {
        handle(WorkerActionType.state, state);
    });

    socket.dataEvent.listen((data) => {
        dataArr.push(data);
    });
}
