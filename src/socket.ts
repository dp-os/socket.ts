import { SocketConnectOptions, SocketConnectState, SocketConnectInstance, SocketConnectSendData, SocketConnectAsyncOptions } from './socket-options';
import { CustomEvent } from './custom-event';

enum UserState {
    connect,
    disconnect,
    destroy
}

export class SocketConnect<T extends {} = MessageEvent> {
    public options: SocketConnectOptions = {
        url: ''
    }
    public state: SocketConnectState = SocketConnectState.stateless;
    private _socket: SocketConnectInstance | null = null
    private _userState: UserState = UserState.connect;
    private _stateEvent = new CustomEvent<SocketConnectState>()
    private _messageEvent = new CustomEvent<T>();
    private _asyncOptions: SocketConnectAsyncOptions | null = null;
    private _sendData: any[] = [];
    public constructor(options: Partial<SocketConnectOptions> | SocketConnectAsyncOptions) {
        if (typeof options === 'function') {
            this._asyncOptions = options;
        } else {
            Object.assign(this.options, options);
        }
        Object.assign(this.options, options);
    }
    public async connect(): Promise<boolean> {
        this._userState = UserState.connect;
        this._connect();
        if (this.state === SocketConnectState.open) {
            return true;
        }
        return new Promise<boolean>((resolve) => {
            const un = this.subscribeState((state) => {
                un();
                switch (state) {
                    case SocketConnectState.open:
                        resolve(true);
                        break;
                    case SocketConnectState.error:
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
        this._updateState(SocketConnectState.close);
        this._sendData.length = 0
        this._stateEvent.destroy();
        this._messageEvent.destroy();
    }
    public subscribeState(listener: (state: SocketConnectState) => void) {
        this._stateEvent.listen(listener);
        return () => {
            this._stateEvent.removeListen(listener);
        }
    }
    public subscribeMessage(listener: (message: T) => void) {
        this._messageEvent.listen(listener);
        return () => {
            this._messageEvent.removeListen(listener);
        }
    }
    public send(data: SocketConnectSendData): boolean {
        const { state, _socket, _sendData } = this;
        if (_socket && state === SocketConnectState.open) {
            _socket.send(data);
            return true;
        }
        _sendData.push(data);
        return false
    }
    public sendJson(data: Record<string, any>): boolean {
        return this.send(JSON.stringify(data));
    }
    private async _connect() {

        if (this.state === SocketConnectState.pending || this.state === SocketConnectState.open) {
            return;
        }

        this._updateState(SocketConnectState.pending);
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
            this._updateState(SocketConnectState.open);
            this._sendData.forEach(data => {
                this.send(data);
            })
            this._sendData.length = 0
        }
        socket.onclose = () => {
            this._updateState(SocketConnectState.close);
            dispose();
        }
        socket.onerror = () => {
            this._updateState(SocketConnectState.error);
            dispose();
        }
        this._socket = socket;
    }
    private async _getAsyncOptions() {
        const { _asyncOptions } = this;
        if (_asyncOptions) {
            const options = await _asyncOptions();
            Object.assign(options, this.options);
        }
    }
    private _updateState(state: SocketConnectState) {

        if (this.state === state) return;
        this.state = state;
        this._stateEvent.dispatchEvent(state);
    }
}

function createWebSocket(url: string, protocols?: string | string[]): SocketConnectInstance {
    return new WebSocket(url, protocols)
}