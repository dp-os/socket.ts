import { SocketOptions, SocketState, SocketBridge, SocketAsyncOptions } from '../socket-options';
import { CustomEvent } from './custom-event';
import { retryPlugin, pingPlugin, offlineDisconnectPlugin } from '../plugins';
import { WebSocketBridge } from '../bridge'


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
    public constructor(options: Partial<SocketOptions> | SocketAsyncOptions) {
        if (typeof options === 'function') {
            this._asyncOptions = options;
        } else {
            Object.assign(this.options, options);
        }
        const plugins = this.options.plugins || [];
        retryPlugin(this);
        pingPlugin(this);
        offlineDisconnectPlugin(this);
        plugins.forEach(plugin => {
            plugin(this);
        });
    }
    /**
     * 连接服务器
     */
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
    /**
     * 断开服务器连接
     */
    public disconnect(): void {
        const { _socket } = this;
        if (_socket) {
            _socket.onClose = null;
            _socket.onError = null;
            _socket.onMessage = null;
            _socket.onOpen = null;
            _socket.close();
            this._socket = null;
            this._updateState(SocketState.close);
        }
    }
    /**
     * 启用连接
     */
    public start() {
        this.disabled = false
        return this.connect();
    }
    /**
     * 停止连接
     */
    public stop() {
        this.disconnect();
        this.disabled = true;
    }
    /**
     * 销毁实例，释放内存
     */
    public dispose(): void {
        this.disconnect();
        this._updateState(SocketState.stateless);
        this._sendData.length = 0;
        this._mapEvent.clear();
    }
    /**
     * 发送数据
     */
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
        this.disconnect();
        this._updateState(SocketState.pending);

        await this._getAsyncOptions();

        const { createBridge, transformMessage = defaultTransformMessage, recognizer } = this.options;

        const socket = createBridge(this.options);
        Object.assign<SocketBridge, Partial<SocketBridge>>(socket, {
            onOpen: () => {
                this._updateState(SocketState.open);
                this._sendData.forEach(data => {
                    this.send(data);
                })
                this._sendData.length = 0;
            },
            onMessage: (ev) => {
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
            },
            onClose: () => {
                this._updateState(SocketState.close);
            },
            onError: () => {
                this._updateState(SocketState.error);
            }
        });

        this._socket = socket;
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
