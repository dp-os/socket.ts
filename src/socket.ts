import { SocketConnectOptions, SocketConnectState, SocketConnectInstance, SocketConnectSendData } from './socket-options';
import { CustomEvent } from './custom-event';

enum UserState {
    connect,
    disconnect,
    destroy
}

export class SocketConnect<T extends {} = MessageEvent> {
    public options: SocketConnectOptions = {
        url: '',
        createSocket(url, protocols) {
            return new WebSocket(url, protocols)
        },
    }
    public state: SocketConnectState = SocketConnectState.stateless;
    private _socket: SocketConnectInstance | null = null
    private _userState: UserState = UserState.connect;
    private _stateEvent = new CustomEvent<SocketConnectState>()
    private _messageEvent = new CustomEvent<T>();
    public constructor(options: Partial<SocketConnectOptions>) {
        this.setOptions(options)
    }
    public setOptions(options: Partial<SocketConnectOptions>) {
        Object.assign(this.options, options);
        return this;
    }
    public connect() {
        this._userState = UserState.connect;
        this._connect();
        return this;
    }

    public disconnect() {
        this._userState = UserState.disconnect;
        this._updateState(SocketConnectState.close);
        if (this._socket) {
            this._socket.close();
            this._socket = null;
        }
        return this;
    }
    public dispose() {
        this.disconnect();
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
        const { state, _socket } = this;
        if (_socket && state === SocketConnectState.open) {
            _socket.send(data);
            return true;
        }
        return false
    }
    public sendJson(data: Record<string, any>): boolean {
        return this.send(JSON.stringify(data));
    }
    private async _connect() {

        if (this.state === SocketConnectState.pending) {
            return;
        }

        this._updateState(SocketConnectState.pending);
        await this._fetchOptions();

        const { url, protocols, createSocket } = this.options;

        if (this._userState === UserState.disconnect) {
            this._updateState(SocketConnectState.close);
            return;
        }
        const socket = createSocket(url, protocols);

        socket.onmessage = (ev) => {
            this._messageEvent.dispatchEvent(ev);
        }
        socket.onopen = () => {
            this._updateState(SocketConnectState.open);
        }
        socket.onclose = () => {
            socket.onopen = null;
            socket.onclose = null;
            socket.onerror = null;
            this._updateState(SocketConnectState.close);
        }
        socket.onerror = () => {
            socket.onopen = null;
            socket.onclose = null;
            socket.onerror = null;
            this._updateState(SocketConnectState.error);
        }
        this._socket = socket;
    }
    private async _fetchOptions() {
        const { fetchOptions } = this.options;
        if (fetchOptions) {
            const options = await fetchOptions();
            this.setOptions(options)
        }
    }
    private _updateState(state: SocketConnectState) {

        if (this.state === state) return;
        this.state = state;
        this._stateEvent.dispatchEvent(state);
    }
}
