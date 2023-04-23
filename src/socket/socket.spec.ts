import { Socket, } from './socket';
import { SocketState, SocketBridge } from './socket-options';
import { test, assert } from 'vitest'

test('createSocket', async () => {
    let testUrl = '';
    let testProtocols: string | string[] | undefined = '';
    const testDataArr: any[] = [];
    const stateArr: SocketState[] = [];
    const socketMock: SocketBridge = {
        onClose: null,
        onError: null,
        onMessage: null,
        onOpen: null,
        send(data) {
            testDataArr.push(data);
        },
        close() {
            socketMock.onClose && socketMock.onClose(new CloseEvent('close'));
        },
    }
    const socket = new Socket({
        url: '/test',
        protocols: '123',
        createSocket(socket) {
            testUrl = socket.options.url;
            testProtocols = socket.options.protocols;
            return socketMock
        },
    });

    socket.send({ value: 'stateless' });

    setTimeout(() => {
        socketMock.onOpen && socketMock.onOpen(new Event('open'));
    }, 100)

    socket.subscribeState((state) => {
        stateArr.push(state);
    });

    assert.equal(socket.state, SocketState.stateless);
    assert.deepEqual(testDataArr, []);

    // Successfully connected
    let ok = await socket.connect();

    socket.send({ value: 'open' });

    assert.isTrue(true);
    assert.equal(socket.state, SocketState.open);
    assert.deepEqual(testDataArr, ['{"value":"stateless"}', '{"value":"open"}']);
    assert.isTrue(ok);
    assert.equal(testUrl, '/test');
    assert.equal(testProtocols, '123');
    assert.deepEqual(stateArr, [SocketState.pending, SocketState.open])

    // Call again in connected state
    ok = await socket.connect();

    assert.isTrue(true);
    assert.equal(socket.state, SocketState.open);
    assert.deepEqual(testDataArr, ['{"value":"stateless"}', '{"value":"open"}']);
    assert.isTrue(ok);
    assert.equal(testUrl, '/test');
    assert.equal(testProtocols, '123');
    assert.deepEqual(stateArr, [SocketState.pending, SocketState.open])

    socket.disconnect();
    assert.equal(socket.state, SocketState.close);
    assert.deepEqual(testDataArr, ['{"value":"stateless"}', '{"value":"open"}']);
    assert.isTrue(ok);
    assert.equal(testUrl, '/test');
    assert.equal(testProtocols, '123');
    assert.deepEqual(stateArr, [SocketState.pending, SocketState.open, SocketState.close])


    socket.send({ value: 'disconnect' });
    setTimeout(() => {
        socketMock.onError && socketMock.onError(new Event('error'));
    }, 100)
    ok = await socket.connect();
    assert.isTrue(true);
    assert.equal(socket.state, SocketState.error);
    assert.deepEqual(testDataArr, ['{"value":"stateless"}', '{"value":"open"}']);
    assert.isFalse(ok);
    assert.equal(testUrl, '/test');
    assert.equal(testProtocols, '123');
    assert.deepEqual(stateArr, [SocketState.pending, SocketState.open, SocketState.close, SocketState.pending, SocketState.error])

    socket.dispose();

    assert.equal(socket.state, SocketState.stateless);
    assert.deepEqual(testDataArr, ['{"value":"stateless"}', '{"value":"open"}']);
    assert.equal(testUrl, '/test');
    assert.equal(testProtocols, '123');
    assert.deepEqual(stateArr, [SocketState.pending, SocketState.open, SocketState.close, SocketState.pending, SocketState.error, SocketState.stateless])
})

test('onMessage', async () => {
    const socketMock: SocketBridge = {
        onClose: null,
        onError: null,
        onMessage: null,
        onOpen: null,
        send() {}, 
        close() { 
            socketMock.onClose && socketMock.onClose(new CloseEvent('close'));
        },
    }
    const socket = new Socket({
        url: '',
        createSocket() {
            return socketMock
        },
    });
    setTimeout(() => {
        socketMock.onOpen && socketMock.onOpen(new Event('open'));
    }, 100)
    await socket.connect();
    const dataArr: any[] = [];
    const un = socket.subscribeMessage((ev) => {
        dataArr.push(ev.data);
    })
    socketMock.onMessage && socketMock.onMessage(new MessageEvent('message', { data: { value: 1 } }))
    socketMock.onMessage && socketMock.onMessage(new MessageEvent('message', { data: { value: 2 } }))

    un();
    socketMock.onMessage && socketMock.onMessage(new MessageEvent('message', { data: { value: 3 } }))
    assert.deepEqual(dataArr, [
        {
            value: 1
        },
        {
            value: 2
        }
    ])
});

test('asyncOptions', async () => {
    const socketMock: SocketBridge = {
        onClose: null,
        onError: null,
        onMessage: null,
        onOpen: null,
        send() {
        },
        close() {
            socketMock.onClose && socketMock.onClose(new CloseEvent('close'));
        },
    }
    let testUrl = '';
    let testProtocols: any = [];
    const socket = new Socket(async () => {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    url: '/test',
                    protocols: ['1', '2'],
                    createSocket(socket) {
                        testUrl = socket.options.url;
                        testProtocols = socket.options.protocols;
                        return socketMock;
                    },
                });
            }, 100)
        })
    });
    setTimeout(() => {
        socketMock.onOpen && socketMock.onOpen(new Event('open'));
    }, 200)
    await socket.connect();

    assert.equal(testUrl, '/test');
    assert.deepEqual(testProtocols, ['1', '2']);
})