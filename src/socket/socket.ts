import { SocketOptions, SocketState, SocketBridge, SocketAsyncOptions } from './socket-options';
import { CustomEvent } from './custom-event';
import { retryPlugin, pingPlugin } from '../plugins';
import { WebSocketBridge, workerPlugin } from '../bridge'

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
        createBridge(socket) {
            return new WebSocketBridge(socket.options.url || '', socket.options.protocols);
        }
    }
    public state: SocketState = SocketState.stateless;
    private _socket: SocketBridge | null = null
    private _userState: UserState = UserState.connect;
    private _stateEvent = new CustomEvent<SocketState>()
    private _messageEvent = new CustomEvent<MessageEvent<MessageData>>();
    private _asyncOptions: SocketAsyncOptions | null = null;
    private _dataEvent = new CustomEvent<MessageData>();
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
        workerPlugin(this);
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
            const un = this.subscribeState((state) => {
                un();
                switch (state) {
                    case SocketState.open:
                        resolve(true);
                        break;
                    case SocketState.error:
                        resolve(false);
                        break;
                }
            });
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
        this._stateEvent.destroy();
        this._messageEvent.destroy();
    }
    public subscribeState(listener: (state: SocketState) => void) {
        this._stateEvent.listen(listener);
        return () => {
            this._stateEvent.removeListen(listener);
        };
    }
    public subscribeMessage(listener: (message: MessageEvent<MessageData>) => void) {
        this._messageEvent.listen(listener);
        return () => {
            this._messageEvent.removeListen(listener);
        };
    }
    public subscribeData(listener: (message: MessageData) => void) {
        this._dataEvent.listen(listener);
        return () => {
            this._dataEvent.removeListen(listener);
        };
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
    private async _connect() {
        if (this.state === SocketState.pending || this.state === SocketState.open) {
            return;
        }

        this._updateState(SocketState.pending);

        await this._getAsyncOptions();

        if (this._userState === UserState.disconnect) {
            return;
        }

        const { createBridge, transformMessage = defaultTransformMessage } = this.options;

        const socket = createBridge(this);

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
            this._messageEvent.dispatchEvent(ev);
            if (this._dataEvent.size >0 ) {
                const data = transformMessage(ev) as MessageData;
                this._dataEvent.dispatchEvent(data);
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
        this._stateEvent.dispatchEvent(state);
    }
}



export function defaultTransformMessage(ev: MessageEvent) {
    const data = ev.data;
    if (typeof data === 'string' && (data.startsWith('{') || data.startsWith('['))) {
        return JSON.parse(data);
    }
    return ev.data;
}