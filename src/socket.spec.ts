import { SocketConnect, } from './socket';
import { SocketConnectState, SocketConnectInstance } from './socket-options';
import { test, assert } from 'vitest'

test('createSocket', async () => {
    let testUrl = '';
    let testProtocols: string | string[] | undefined = '';
    let testDataArr: any[] = [];
    const stateArr: SocketConnectState[] = [];
    const socketMock: SocketConnectInstance = {
        onclose: null,
        onerror: null,
        onmessage: null,
        onopen: null,
        send(data) {
            testDataArr.push(data);
        },
        close() {
            socketMock.onclose && socketMock.onclose({});
        },
    }
    const socket = new SocketConnect({
        url: '/test',
        protocols: '123',
        createSocket(url, protocols) {
            testUrl = url;
            testProtocols = protocols;

            return socketMock
        },
    });

    socket.sendJson({ value: 'stateless' });

    setTimeout(() => {
        socketMock.onopen && socketMock.onopen({});
    }, 100)

    socket.subscribeState((state) => {
        stateArr.push(state);
    });

    assert.equal(socket.state, SocketConnectState.stateless);
    assert.deepEqual(testDataArr, []);

    // Successfully connected
    let ok = await socket.connect();

    socket.sendJson({ value: 'open' });

    assert.isTrue(true);
    assert.equal(socket.state, SocketConnectState.open);
    assert.deepEqual(testDataArr, ['{"value":"stateless"}', '{"value":"open"}']);
    assert.isTrue(ok);
    assert.equal(testUrl, '/test');
    assert.equal(testProtocols, '123');
    assert.deepEqual(stateArr, [SocketConnectState.pending, SocketConnectState.open])

    // Call again in connected state
    ok = await socket.connect();

    assert.isTrue(true);
    assert.equal(socket.state, SocketConnectState.open);
    assert.deepEqual(testDataArr, ['{"value":"stateless"}', '{"value":"open"}']);
    assert.isTrue(ok);
    assert.equal(testUrl, '/test');
    assert.equal(testProtocols, '123');
    assert.deepEqual(stateArr, [SocketConnectState.pending, SocketConnectState.open])

    socket.disconnect();
    assert.equal(socket.state, SocketConnectState.close);
    assert.deepEqual(testDataArr, ['{"value":"stateless"}', '{"value":"open"}']);
    assert.isTrue(ok);
    assert.equal(testUrl, '/test');
    assert.equal(testProtocols, '123');
    assert.deepEqual(stateArr, [SocketConnectState.pending, SocketConnectState.open, SocketConnectState.close])


    socket.sendJson({ value: 'disconnect' });
    setTimeout(() => {
        socketMock.onerror && socketMock.onerror({});
    }, 100)
    ok = await socket.connect();
    assert.isTrue(true);
    assert.equal(socket.state, SocketConnectState.error);
    assert.deepEqual(testDataArr, ['{"value":"stateless"}', '{"value":"open"}']);
    assert.isFalse(ok);
    assert.equal(testUrl, '/test');
    assert.equal(testProtocols, '123');
    assert.deepEqual(stateArr, [SocketConnectState.pending, SocketConnectState.open, SocketConnectState.close, SocketConnectState.pending, SocketConnectState.error])

    socket.dispose();

    assert.equal(socket.state, SocketConnectState.close); 
    assert.deepEqual(testDataArr, ['{"value":"stateless"}', '{"value":"open"}']);
    assert.equal(testUrl, '/test');
    assert.equal(testProtocols, '123');
    assert.deepEqual(stateArr, [SocketConnectState.pending, SocketConnectState.open, SocketConnectState.close, SocketConnectState.pending, SocketConnectState.error, SocketConnectState.close])
})