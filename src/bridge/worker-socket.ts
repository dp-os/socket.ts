import type { Socket } from '../socket';
import { SocketState, type SocketBridge } from '../socket-options';

const isWorker = (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope);

enum UIActionType {
    send = 'send',
    ping = 'ping'
}
enum WorkerActionType {
    state = 'state',
    message = 'message'
}

export interface WorkerSocketBridgeOptions {
    pingInterval?: number;
    initParams?: any;
}

export function initSocketInWorker(cb: (params: any) => void) {
    if (isWorker) {
        const onMessage = (event: MessageEvent) => {
            cb(event.data);
            removeEventListener('message', onMessage)
        };
        addEventListener('message', onMessage);
    }
}

export class WorkerSocketBridge implements SocketBridge {
    private _worker: Worker;
    private _timer: NodeJS.Timeout | null = null;
    private pingInterval: number;
    public constructor(worker: Worker, options: WorkerSocketBridgeOptions = {}) {
        this._worker = worker;
        this.pingInterval = options.pingInterval || 50;
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
                        case SocketState.close:
                            this.onClose && this.onClose(new CloseEvent('close'))
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
        if (options.initParams) {
            worker.postMessage(options.initParams);
        }
        this._ping = this._ping.bind(this);
        this._ping();
    }
    private _ping() {
        this._worker.postMessage({
            type: UIActionType.ping
        });
        this._timer = setTimeout(this._ping, this.pingInterval);
    }
    public onOpen: SocketBridge['onOpen'] = null;
    public onMessage: SocketBridge['onMessage'] = null;
    public onClose: SocketBridge['onClose'] = null;
    public onError: SocketBridge['onError'] = null;
    public close() {
        this._worker.terminate();
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

export interface WorkerInterceptInstance {
    data: (data: any) => void;
    ping: () => void;
}


export type WorkerCreateInterceptInstance = (postMessage: (...data: any[]) => void) => WorkerInterceptInstance;

export interface WorkerSyncToWindowPluginOptions {
    createIntercept?: WorkerCreateInterceptInstance;
}

const defaultIntercept: WorkerCreateInterceptInstance = (postMessage) => {
    return {
        data: postMessage,
        ping() {
        }
    }
}

export function workerSyncToWindowPlugin(options: WorkerSyncToWindowPluginOptions = {}) {
    return (socket: Socket, ) => {
        const createIntercept =  options.createIntercept || defaultIntercept;
        const intercept = createIntercept((...data: any[]) => {
            handle(WorkerActionType.message, data);
        });
        function handle(type: UIActionType | WorkerActionType, data: any) {
            switch (type) {
                case UIActionType.send:
                    socket.send(data);
                    break;
                case UIActionType.ping:
                    intercept.ping();
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
        socket.subscribeState((state) => {
            handle(WorkerActionType.state, state);
        });
        socket.subscribeData(intercept.data);
    }
}
