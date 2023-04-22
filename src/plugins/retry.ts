import { type Socket, SocketState } from '../socket';

export function retryPlugin(socket: Socket) {
    if (typeof window !=='object') {
        return;
    }
    let timer: NodeJS.Timeout | null = null;
    const connect =() => {
        socket.connect();
    }
    const end = () => {
        if (timer) {
            window.removeEventListener('online', connect);
            window.removeEventListener('offline', end);
            clearTimeout(timer);
            timer = null;
        }
    }
    const start = () => {
        if (!timer) {
            window.addEventListener('online', connect);
            window.addEventListener('offline', end);
            timer = setTimeout(() => {
                timer = null;
                connect();
            }, socket.options.retryInterval || 3000)
        }
    }

    socket.subscribeState((state) => {
        switch (state) {
            case SocketState.stateless:
            case SocketState.pending:
            case SocketState.open:
                end()
                break;
            case SocketState.close:
            case SocketState.error:
                start();
                break;
        }
    });
}