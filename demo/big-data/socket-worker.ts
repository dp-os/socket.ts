import { Socket, workerSyncToWindowPlugin, WorkerCreateInterceptInstance, initSocketInWorker } from '../../src';


const intercept: WorkerCreateInterceptInstance = (postMessage) => {
    const map = new Map<string, any>();
    return {
        data(data) {
            switch (data.event) {
                case 'pushClientSymbol':
                    postMessage(data);
                    break;
                case 'pushQuote':
                    map.set(data.symbol.symbol, data);
                    break;
            }
        },
        ping() {
            if (!map.size) return;

            const arr: any[] = [];
            const iterator = map.entries();
            while (arr.length < 30) {
                const { done, value } = iterator.next();
                if (done) {
                    break;
                }
                arr.push(value[1]);
                map.delete(value[0]);
            }
            console.log('>> push', arr.length, map.size)
            postMessage(...arr);
        }
    }
}

initSocketInWorker((params) => {
    const socket = new Socket({
        url: params.url,
        protocols: params.protocols,
        plugins: [
            workerSyncToWindowPlugin({
                createIntercept: intercept
            })
        ]
    });
    
    socket.connect();
})