import { Socket, SocketState, visiblePlugin } from '../../src';

const socket = new Socket({
    url: 'ws://localhost:5173',
    protocols: 'vite-hmr',
    plugins: [
        visiblePlugin({
            visible: (socket) => {
                socket.send({
                    type: 'visible',
                })
            },
            invisible: (socket) => {
                socket.send({
                    type: 'invisible',
                })
            },
        })
    ]
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
            case SocketState.stateless:
                text = 'Not connected';
                break;
            case SocketState.pending:
                text = 'Connecting';
                break;
            case SocketState.open:
                text = 'Successfully connected';
                break;
            case SocketState.close:
                text = 'Connection closed';
                break;
            case SocketState.error:
                text = 'Connection error';
                break;
        }
        stateEl.innerText = text;
    })
}
initConnect();
initState();
