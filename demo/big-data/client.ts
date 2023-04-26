// @ts-ignore
import SocketWorker from './socket-worker?worker';
import { Socket, SocketState, WorkerSocketBridge } from '../../src';
import { EVENT_ACTION, SymbolDetail } from './config';
import Vue from 'vue';

const socket = new Socket({
    createBridge() {
        return new WorkerSocketBridge(new SocketWorker());
    },
})

const app = new Vue<{ state: SocketState, symbolList: SymbolDetail[] }>({
    data () {
        return {
            state: SocketState.stateless,
            symbolList: []
        }
    },
    computed: {
        stateText(){
            let text = '';
            switch (this.state) {
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

            return text;
        }
    },
    methods: {
        onConnect () {
            socket.connect()
        },
        onDisconnect () {
            socket.disconnect()
        },
        getSymbolList() {
            socket.send({
                type: 'custom',
                event: EVENT_ACTION.pullServerSymbol
            })
        },
        subscribeQuote () {
            socket.send({
                type: 'custom',
                event: EVENT_ACTION.subscribeServerQuote
            })
        },
        unSubscribeServerQuote () {
            socket.send({
                type: 'custom',
                event: EVENT_ACTION.unSubscribeServerQuote
            })
        }
    }
});

app.$mount('#app');

socket.subscribeState((state) => {
    app.state = state;
})
socket.subscribeMessage((result) => {
    switch (result.event) {
        case EVENT_ACTION.pushClientSymbol:
            app.symbolList = result.symbols;
            break;
        case EVENT_ACTION.pushQuote:
            updateSymbol(result.symbol);
            break;
    }
})
function updateSymbol (symbol: SymbolDetail) {
    const item = app.symbolList.find(item => {
        return item.symbol === symbol.symbol;
    })
    if (item) {
        Object.assign(item, symbol);
    }
}