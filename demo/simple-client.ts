import { SocketConnect, SocketConnectState } from '../src';

const socket = new SocketConnect({
    url: 'ws://localhost:5173',
    protocols: 'vite-hmr'
})

function initConnect() {
    const connectEl = document.getElementById('connect')!;
    const disconnectEl = document.getElementById('disconnect')!;

    connectEl.onclick = () => {
        socket.connect()
    }
    disconnectEl.onclick = () => {
        socket.disconnect()
    }
}

function initState() {
    const stateEl = document.getElementById('state')!;
    socket.subscribeState((state) => {
        let text = '';
        switch (state) {
            case SocketConnectState.stateless:
                text = 'Not connected';
                break;
            case SocketConnectState.pending:
                text = 'Connecting';
                break;
            case SocketConnectState.open:
                text = 'Successfully connected';
                break;
            case SocketConnectState.close:
                text = 'Connection closed';
                break;
            case SocketConnectState.error:
                text = 'Connection error';
                break;
        }
        stateEl.innerText = text;
    })
}

function initTime() {
    const timeEl = document.getElementById('time')!;

    socket.subscribeMessage((ev) => {
        const result = JSON.parse(ev.data);
        if (result.event === 'server-time') {
            timeEl.innerText = result.data.date;
        }
    });
}
export function initSubscribe() {
    const subscribeEl =document.getElementById('subscribe')!;
    const unsubscribe = document.getElementById('unsubscribe')!;

    subscribeEl.onclick = () => {
        socket.sendJson({
            type: 'custom',
            event: 'server-time',
            data: true
        })
    }
    unsubscribe.onclick = () => {
        socket.sendJson({
            type: 'custom',
            event: 'server-time',
            data: false
        })
    }

}
initConnect();
initState();
initTime();
initSubscribe()



