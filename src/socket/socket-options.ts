import { type Socket } from './socket';

export interface SocketConnectInstance {
    onmessage: ((event: any) => void) | null;
    onopen: ((event: any) => void) | null;
    onclose: ((event: any) => void) | null;
    onerror: ((event: any) => void) | null;
    close: (code?: number, reason?: string) => void
    send(data: any): void;
}

export type SocketPlugin = (socket: Socket) => void;

export interface SocketOptions {
    url: string;
    protocols?: string | string[];
    retryTime?: number;
    createSocket?: (url: string, protocols?: string | string[]) => SocketConnectInstance;
    plugins?: SocketPlugin[]
}

export type SocketAsyncOptions = (() => Promise<Partial<SocketOptions>>);

export enum SocketState {
    stateless = 'stateless',
    pending = 'pending',
    open = 'open',
    error = 'error',
    close = 'close'
}
