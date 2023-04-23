import { type SocketBridge } from '../socket';

export class WebSocketBridge implements SocketBridge {
    private _socket: globalThis.WebSocket;
    public constructor (url: string, protocols?: string | string[]) {
        this._socket = new globalThis.WebSocket(url, protocols);
    }
    public get onOpen() {
        return this._socket.onopen;
    }
    public set onOpen(value) {
        this._socket.onopen = value;
    }
    public get onClose() {
        return this._socket.onclose;
    }
    public set onClose(value) {
        this._socket.onclose = value;
    }
    public get onError() {
        return this._socket.onerror;
    }
    public set onError(value) {
        this._socket.onerror = value;
    }
    public get onMessage() {
        return this._socket.onmessage;
    }
    public set onMessage(value) {
        this._socket.onmessage = value;
    }
    public send(data: any): void {
        this._socket.send(data);
    }
    public close (code?: number | undefined, reason?: string | undefined) {
        this._socket.close(code, reason);
    }
}
