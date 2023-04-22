import { SocketConnectOptions, SocketConnectState } from './socket-options';
import { CustomEvent } from './custom-event';

enum UserState {
    connect,
    disconnect
}

export class SocketConnect {
    public options: SocketConnectOptions = {
        url: '',
        protocols: ''
    }
    public state: SocketConnectState = SocketConnectState.stateless;
    private _socket: WebSocket | null = null
    private _userState: UserState = UserState.connect;
    private _stateEvent = new CustomEvent<SocketConnectState>()
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
    }

    public disconnect() {
        this._userState = UserState.disconnect;
        this._updateState(SocketConnectState.close);
        if (this._socket) {
            this._socket.close();
            this._socket = null;
        }
    }
    public subscribeState(listener: (state: SocketConnectState) => void) {
        this._stateEvent.listen(listener);
        return () => {
            this._stateEvent.removeListen(listener);
        }
    }
    private async _connect() {

        if (this.state === SocketConnectState.pending) {
            return;
        }

        this._updateState(SocketConnectState.pending);
        await this._fetchOptions();

        const { url, protocols } = this.options;

        if (this._userState === UserState.disconnect) {
            this._updateState(SocketConnectState.close);
            return;
        }
        const socket = new WebSocket(url, protocols);

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
