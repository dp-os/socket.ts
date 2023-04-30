import { SocketOptions, SocketState, SocketBridge, SocketAsyncOptions } from './socket-options';
import { CustomEvent } from './custom-event';
import { retryPlugin, pingPlugin } from '../plugins';
import { WebSocketBridge } from '../bridge'

enum UserState {
    connect,
    disconnect,
    destroy,
}

export class Socket<Send extends {} = any, MessageData extends {} = any> {
    public options: SocketOptions = {
        url: '',
        retryInterval: 1000 * 30,
        pingInterval: 1000 * 60,
        createBridge(options) {
            return new WebSocketBridge(options.url || '', options.protocols);
        }
    }
    public state: SocketState = SocketState.stateless;
    private _mapEvent = new Map<string, CustomEvent<any>>();
    private _socket: SocketBridge | null = null
    private _userState: UserState = UserState.connect;

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
        plugins.forEach(plugin => {
            plugin(this);
        });
    }
    public async connect(): Promise<boolean> {
        this._userState = UserState.connect;
        this._connect();
        if (this.state === SocketState.open) {
            return true;
        }
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
        this._userState = UserState.disconnect;
        if (this._socket) {
            this._socket.close();
            this._socket = null;
        }
    }
    public dispose(): void {
        this.disconnect();
        this._updateState(SocketState.stateless);
        this._sendData.length = 0;
        this._mapEvent.clear();
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
        if (this.state === SocketState.pending || this.state === SocketState.open) {
            return;
        }

        this._updateState(SocketState.pending);

        await this._getAsyncOptions();

        if (this._userState === UserState.disconnect) {
            return;
        }

        const { createBridge, transformMessage = defaultTransformMessage, recognizer } = this.options;

        const socket = createBridge(this.options);

        const dispose = () => {
            socket.onOpen = null;
            socket.onMessage = null;
            socket.onClose = null;
            socket.onError = null;
        }

        socket.onOpen = () => {
            this._updateState(SocketState.open);
            this._sendData.forEach(data => {
                this.send(data);
            })
            this._sendData.length = 0;
        }
        socket.onMessage = (ev) => {
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

        socket.onClose = () => {
            this._updateState(SocketState.close);
            dispose();
        }

        socket.onError = () => {
            this._updateState(SocketState.error);
            dispose();
        }

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