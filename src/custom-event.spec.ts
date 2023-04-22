import { assert, test } from 'vitest';

import { CustomEvent } from './custom-event';

test('base', () => {
    const arr: number[] = [];
    const ce = new CustomEvent<number, boolean>();
    ce.listen((num) => {
        arr.push(num);
        return arr.length % 2 === 0;
    });
    assert.equal(ce.size, 1);

    assert.deepEqual(ce.dispatchEvent(1), [false]);
    assert.deepEqual(arr, [1]);

    assert.deepEqual(ce.dispatchEvent(2), [true]);
    assert.deepEqual(arr, [1, 2]);

    ce.destroy();
    assert.deepEqual(ce.dispatchEvent(3), []);
    assert.deepEqual(arr, [1, 2]);
});
test('removeListen', () => {
    const ce = new CustomEvent();
    const func = () => {};
    ce.listen(func);
    assert.equal(ce.size, 1);

    ce.removeListen(func);
    assert.equal(ce.size, 0);
});
