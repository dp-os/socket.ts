export interface SocketConnectOptions {
    url: string;
    protocols: string | string[];
    fetchOptions?: () => Promise<Partial<SocketConnectOptions>>;
}

export enum SocketConnectState {
    stateless,
    pending,
    open,
    error,
    close
}