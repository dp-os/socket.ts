import { Socket, SocketState } from '../socket';

export function pingPlugin(socket: Socket) {
    if (typeof window !=='object') {
        return;
    }
    let timer: NodeJS.Timeout | null = null;
    const defaultData ={
        type: 'heartbeat'
    }
    const start = () => {
        if (!timer) {
            const { pingData = defaultData, pingInterval = 0 } = socket.options;
            if (pingInterval > 0) {
                timer = setTimeout(() => {
                    timer = null;
                    socket.send(pingData)
                    start();
                }, pingInterval);
            }
        }
    };
    const end = () => {
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }
    }
    socket.subscribeState((state) => {
        if (state === SocketState.open) {
            start();
        } else {
            end()
        }
    })
}
