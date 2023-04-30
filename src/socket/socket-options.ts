import { type Socket } from './socket';

export interface SocketBridge {
    onMessage: ((ev: MessageEvent) => void) | null;
    onOpen: ((ev: Event) => any) | null;
    onClose: ((ev: CloseEvent) => any) | null;
    onError: ((ev: Event) => any) | null;
    close: (code?: number, reason?: string) => void;
    send(data: any): void;
}

export type SocketPlugin = (socket: Socket) => void;

export type SocketAsyncOptions = (() => Promise<Partial<Omit<SocketOptions, 'plugins'>>>);

export enum SocketState {
    stateless = 'stateless',
    pending = 'pending',
    open = 'open',
    error = 'error',
    close = 'close',
}

export interface SocketOptions {
    /**
     * The URL of the Socket request.
     */
    url?: string;
    /**
     * The protocol of the Socket request.
     */
    protocols?: string | string[];
    /**
     * The interval between reconnection attempts after the connection is lost, in milliseconds. Default is: 1000 * 30.
     */
    retryInterval?: number;
    /**
     * The interval between sending heartbeats, in milliseconds. Default is: 1000 * 60.
     */
    pingInterval?: number;
    /**
     * The data to be sent with the heartbeat.
     */
    pingData?: any;
    /**
     * Create a bridge. The default bridge is WorkerSocketBridge.
     * @param socket The current Socket instance.
     * @returns 
     */
    createBridge: (options: SocketOptions) => SocketBridge;
    /**
     * After receiving data pushed from the server, you want to convert it into another format.
     * @param event
     * @returns Returns the converted data.
    */
    transformMessage?: (event: MessageEvent) => any
    /**
     * The plugins used.
     */
    plugins?: SocketPlugin[];
    recognizer?: (data: any) => { event: string; data: any } | void;
}
