import { type Socket } from './socket';

export interface SocketBridge {
    onMessage: ((ev: MessageEvent) => void) | null;
    onOpen: ((ev: Event) => any) | null
    onClose: ((ev: CloseEvent) => any) | null
    onError: ((ev: Event) => any) | null
    close: (code?: number, reason?: string) => void
    send(data: any): void;
}

export type SocketPlugin = (socket: Socket) => void;

export interface SocketOptions {
    url: string;
    protocols?: string | string[];
    retryInterval?: number;
    pingInterval?: number;
    pingData?: any;
    createSocket: (socket: Socket) => SocketBridge;
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
