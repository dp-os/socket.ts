import type { Socket } from '../socket';
import { SocketState } from '../socket-options'

/**
 * 网络断开，一定的时间后，强制断开 Socket 
 */
export function offlineDisconnectPlugin(socket: Socket) {
    if (typeof window !=='object') {
        return;
    }
    let timer: NodeJS.Timeout | null = null;
    const end = () => {
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }
    }
    const start = () => {
        timer = setTimeout(() => {
            if (socket.state === SocketState.open) {
                socket.disconnect();
            }
        }, socket.options.offlineTime)
    }

    socket.subscribeState((state) => {
        switch (state) {
            case SocketState.open:
                window.addEventListener('offline', start);
                window.addEventListener('online', end);
                break;
            case SocketState.close:
            case SocketState.error:
                window.removeEventListener('offline', start);
                window.removeEventListener('online', end);
                break;
        }
    });
}
