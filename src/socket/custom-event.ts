type CustomEventListener<T, R> = (data: T) => R;

export class CustomEvent<T, R = any> {
    private _list: CustomEventListener<T, R>[] = [];
    public get size() {
        return this._list.length;
    }
    /**
     * 监听事件
     */
    public listen(listener: CustomEventListener<T, R>) {
        this._list.push(listener);

        return listener;
    }
    /**
     * 发射事件
     */
    public dispatchEvent(data: T) {
        return [...this._list].map((cb) => cb(data));
    }
    /**
     * 移除事件监听
     */
    public removeListen(listener: CustomEventListener<T, R>) {
        const index = this._list.indexOf(listener);
        if (index > -1) {
            this._list.splice(index, 1);
        }
    }
    /**
     * 销毁全部的监听
     */
    public destroy() {
        this._list.splice(0);
    }
}
