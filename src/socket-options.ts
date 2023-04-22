export type SocketConnectSendData = string | ArrayBufferLike | Blob | ArrayBufferView;
export interface SocketConnectInstance {
    onmessage: ((event: any) => void) | null;
    onopen: ((event: any) => void) | null;
    onclose: ((event: any) => void) | null;
    onerror: ((event: any) => void) | null;
    close: (code?: number, reason?: string) => void
    send(data: SocketConnectSendData): void;
}

export interface SocketConnectOptions {
    url: string;
    protocols?: string | string[];
    createSocket: (url: string, protocols?: string | string[]) => SocketConnectInstance;
    fetchOptions?: () => Promise<Partial<SocketConnectOptions>>;
}

export enum SocketConnectState {
    stateless,
    pending,
    open,
    error,
    close
}