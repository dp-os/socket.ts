import { SocketOptions, SocketState, SocketConnectInstance, SocketAsyncOptions } from './socket-options';
import { CustomEvent } from './custom-event';
import { retryPlugin, heartbeatPlugin } from '../plugins';

enum UserState {
    connect,
    disconnect,
    destroy
}

export class Socket<Send extends {} = any, Message extends {} = any> {
    public options: SocketOptions = {
        url: '',
        retryInterval: 3000,
        heartbeatInterval: 1000 * 60
    }
    public state: SocketState = SocketState.stateless;
    private _socket: SocketConnectInstance | null = null
    private _userState: UserState = UserState.connect;
    private _stateEvent = new CustomEvent<SocketState>()
    private _messageEvent = new CustomEvent<Message>();
    private _asyncOptions: SocketAsyncOptions | null = null;
    private _sendData: any[] = [];
    public constructor(options: Partial<SocketOptions> | SocketAsyncOptions) {
        if (typeof options === 'function') {
            this._asyncOptions = options;
        } else {
            Object.assign(this.options, options);
        }
        retryPlugin(this);
        heartbeatPlugin(this);
    }
    public async connect(): Promise<boolean> {
        this._userState = UserState.connect;
        this._connect();
        if (typeof navigator === 'object' && navigator.onLine) {
            return false;
        } else if (this.state === SocketState.open) {
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
        this._sendData.length = 0
        this._stateEvent.destroy();
        this._messageEvent.destroy();
    }
    public subscribeState(listener: (state: SocketState) => void) {
        this._stateEvent.listen(listener);
        return () => {
            this._stateEvent.removeListen(listener);
        }
    }
    public subscribeMessage(listener: (message: Message) => void) {
        this._messageEvent.listen(listener);
        return () => {
            this._messageEvent.removeListen(listener);
        }
    }
    public send(data: Send): boolean {
        const { state, _socket, _sendData } = this;
        if (_socket && state === SocketState.open) {
            if (data instanceof ArrayBuffer) {
                _sendData.push(data);
            } else {
                _socket.send(JSON.stringify(data));
            }
            return true;
        }
        _sendData.push(data);
        return false
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
        const { url, protocols, createSocket = createWebSocket } = this.options;

        const socket = createSocket(url, protocols);

        const dispose = () => {
            socket.onopen = null;
            socket.onmessage = null;
            socket.onclose = null;
            socket.onerror = null;
        }
        socket.onmessage = (ev) => {
            this._messageEvent.dispatchEvent(ev);
        }
        socket.onopen = () => {
            this._updateState(SocketState.open);
            this._sendData.forEach(data => {
                this.send(data);
            })
            this._sendData.length = 0
        }
        socket.onclose = () => {
            this._updateState(SocketState.close);
            dispose();
        }
        socket.onerror = () => {
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

function createWebSocket(url: string, protocols?: string | string[]): SocketConnectInstance {
    return new WebSocket(url, protocols)
}