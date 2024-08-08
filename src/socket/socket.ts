import { SocketOptions, SocketState, SocketBridge, SocketAsyncOptions } from './socket-options';
import { CustomEvent } from './custom-event';
import { retryPlugin, pingPlugin } from '../plugins';
import { WebSocketBridge } from '../bridge'

const isWindow = typeof Window === 'object';


export class Socket<Send extends {} = any, MessageData extends {} = any> {
    public options: SocketOptions = {
        url: '',
        retryInterval: 1000 * 30,
        pingInterval: 1000 * 60,
        offlineTime: 5000,
        createBridge(options) {
            return new WebSocketBridge(options.url || '', options.protocols);
        }
    }
    public state: SocketState = SocketState.stateless;
    public disabled = false;
    private _mapEvent = new Map<string, CustomEvent<any>>();
    private _socket: SocketBridge | null = null

    private _asyncOptions: SocketAsyncOptions | null = null;
    private _sendData: any[] = [];
    private _dispose: (() => void) | null = null;
    public constructor(options: Partial<SocketOptions> | SocketAsyncOptions) {
        if (typeof options === 'function') {
            this._asyncOptions = options;
        } else {
            Object.assign(this.options, options);
        }
        const plugins = this.options.plugins || [];
        retryPlugin(this);
        pingPlugin(this);
        plugins.forEach(plugin => {
            plugin(this);
        });
    }
    public async connect(): Promise<boolean> {
        const { disabled, state } = this;
        if (disabled) {
            return false;
        }
        if (state === SocketState.open) {
            return true;
        }
        if (state !== SocketState.pending && typeof navigator === 'object' && !navigator.onLine) {
            return false;
        }
        this._connect();
        return new Promise<boolean>((resolve) => {
            const listen = (state: SocketState) => {
                un();
                switch (state) {
                    case SocketState.open:
                        resolve(true);
                        break;
                    case SocketState.error:
                        resolve(false);
                        break;
                }
            }
            const un = this.subscribeState(listen);
        })
    }

    public disconnect(): void {
        if (this._socket) {
            this._socket.close();
            this._socket = null;
        }
    }
    public start() {
        this.disabled = false
        return this.connect();
    }
    public stop() {
        this.disabled = true;
        this.disconnect();
    }
    public dispose(): void {
        this.disconnect();
        this._updateState(SocketState.stateless);
        this._sendData.length = 0;
        this._mapEvent.clear();
        this._dispose?.();
    }
    public send(data: Send): boolean {
        const { state, _socket, _sendData } = this;
        if (_socket && state === SocketState.open) {
            if (data instanceof ArrayBuffer) {
                _sendData.push(data);
            } else if (typeof data === 'string') {
                _socket.send(data);
            } else {
                _socket.send(JSON.stringify(data));
            }
            return true;
        }
        _sendData.push(data);
        return false;
    }
    public subscribe(name: string, listener: (message: any) => void) {
        let event = this._mapEvent.get(name);
        if (!event) {
            event = new CustomEvent();
            this._mapEvent.set(name, event);
        }
        event.listen(listener);
        return () => {
            event!.removeListen(listener);
        }
    }
    public dispatchEvent(name: string, data: any) {
        const event = this._mapEvent.get(name);
        if (event && event.size > 0) {
            event.dispatchEvent(data);
        }
    }
    public subscribeState(listener: (state: SocketState) => void) {
        return this.subscribe('state', listener)
    }
    public subscribeMessage(listener: (message: MessageEvent<MessageData>) => void) {
        return this.subscribe('message', listener)
    }
    public subscribeData(listener: (message: any) => void) {
        return this.subscribe('data', listener)
    }
    private async _connect() {
        if (this.state === SocketState.pending) {
            return;
        }
        if (this._dispose) {
            this._dispose()
            this._dispose = null;
        }

        this._updateState(SocketState.pending);

        await this._getAsyncOptions();

        const { createBridge, transformMessage = defaultTransformMessage, recognizer } = this.options;

        const socket = createBridge(this.options);

        let timer: NodeJS.Timeout | null = null;
        const close = () => {
            this._updateState(SocketState.close);
            dispose();
        }
        const clear = () => {
            if (timer) {
                clearTimeout(timer);
                timer = null;
            }
        }
        const offline = () => {
            clear();
            timer = setTimeout(() => {
                if (this.state === SocketState.open) {
                    close();
                }
            }, this.options.offlineTime)
        }
        const dispose = () => {
            clear();
            socket.onOpen = null;
            socket.onMessage = null;
            socket.onClose = null;
            socket.onError = null;
            if (isWindow) {
                window.removeEventListener('offline', offline);
                window.removeEventListener('online', clear);
            }
        }

        socket.onOpen = () => {
            this._updateState(SocketState.open);
            this._sendData.forEach(data => {
                this.send(data);
            })
            this._sendData.length = 0;
        }
        socket.onMessage = (ev) => {
            if (this.state !== SocketState.open) {
                return
            }
            this.dispatchEvent('message', ev);
            const data = transformMessage(ev) as MessageData;
            this.dispatchEvent('data', data);
            if (recognizer) {
                const result = recognizer(data);
                if (result) {
                    this.dispatchEvent(result.event, result.data);
                }
            }
        }

        socket.onClose = close;

        socket.onError = () => {
            this._updateState(SocketState.error);
            dispose();
        }
        if (typeof window === 'object') {
            window.addEventListener('offline', offline);
            window.addEventListener('online', clear);
        }

        this._socket = socket;
        this._dispose = dispose
    }
    private async _getAsyncOptions() {
        const { _asyncOptions } = this;
        if (_asyncOptions) {
            const options = await _asyncOptions();
            Object.assign(this.options, options);
        }
    }
    private _updateState(state: SocketState) {
        if (this.state === state) return;
        this.state = state;
        this.dispatchEvent('state', state);
    }
}



export function defaultTransformMessage(ev: MessageEvent) {
    const data = ev.data;
    if (typeof data === 'string' && (data.startsWith('{') || data.startsWith('['))) {
        return JSON.parse(data);
    }
    return ev.data;
}