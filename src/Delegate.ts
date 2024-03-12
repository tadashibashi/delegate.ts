interface ICallbackWrapper<TArgs extends any[]> {
    context: any;
    func: (...args: TArgs) => void | Promise<void>;
}
/** Check if callback signatures match */
function callbacksEqual<TArgs extends any[]>(cb: ICallbackWrapper<TArgs>, func: (...args: TArgs) => void, context: any) {
    return cb.context === context && cb.func === func;
}

/** Delegate command queue command type */
enum CommandType {
    Add, Remove
}
/** Delegate command queue command */
interface ICommand<TArgs extends any[]> {
    data: ICallbackWrapper<TArgs>;
    type: CommandType;
}

/**
 * Specific error codes for Delegate errors
 */
export enum DelegateErrorType {
    /** Callback invoked delegate recursively */
    RecursiveCall=0,
    /** Delegate registered itself as a callback */
    AddedSelfAsCallback,
}

/**
 * Error type thrown by Delegate
 */
export class DelegateError extends Error {
    errorType: DelegateErrorType;
    constructor(message: string, errorType: DelegateErrorType) {
        super(message);
        this.errorType = errorType;
    }
}

const delegateProxyHandler = {
    apply(target, _, args) {
        target.invoke(...args);
    },
    get(target, key, _) {
        return target[key];
    }
} as ProxyHandler<any>;

/**
 * A simple event emitter that executes subscribed listeners.
 *
 * Listeners are executed in the order they were added.
 * Reference arguments passed to listeners are the same across all callbacks, so objects/arrays should be mutated with care.
 *
 * Calling this delegate during invocation is not allowed to avoid complexity from possible recursion
 * across listeners, and to protect the stack. A `DelegateError` will be thrown in this case.
 * All calls to `Delegate#asyncSeq` and `Delegate#asyncAll` should be awaited to avoid this exception,
 * and no listener should invoke the Delegate it is registered to.
 *
 * It's safe to call `Delegate#addListener` and `Delegate#removeListener`
 * during the callback, the action will be delayed until all listener callbacks are complete.
 *
 * Compatibility / Platform:
 * Cross-platform between browser, node.js, bun, etc.
 * Requires ES6, due to the use of `Proxy` and `Promise`
 *
 */
export interface Delegate<TArgs extends any[]> {
    /**
     * Execute all registered callbacks, without awaiting asynchronous callbacks
     * @throws { Delegate Error } if a recursive call to the Delegate was made during any registered callback
     */
    (...args: TArgs): void;
}
export class Delegate<TArgs extends any[] = []> extends Function {
    private readonly callbacks: ICallbackWrapper<TArgs>[];
    private readonly commandQueue: ICommand<TArgs>[];
    private isCalling: boolean;

    constructor() {
        super();

        // Mount all own members onto the this-bound Delegate
        this.callbacks = [];
        this.commandQueue = [];
        this.isCalling = false;

        return new Proxy(this, delegateProxyHandler);
    }

    /**
     * Add a callback listener to the delegate
     * @param func    callback function
     * @param context optional `this` object on which the function will be applied
     * @returns this object for chaining
     *
     * @throws DelegateError if you add this Delegate as its own listener
     */
    addListener(func: (...args: TArgs) => void, context: any = globalThis): this {
        // avoid infinite recursion from adding this delegate as its own callback
        if (func === this) {
            throw new DelegateError("Cannot add Delegate as its own callback",
                DelegateErrorType.AddedSelfAsCallback);
        }

        if (this.isCalling) {
            // delay add function if Delegate is invoking callbacks
            this.commandQueue.push({
                type: CommandType.Add,
                data: { func, context }
            });
        } else {
            // add callback immediately otherwise
            this.addListenerImpl({ func, context });
        }

        return this;
    }

    /**
     * Remove a callback listener to the delegate that was previously added
     * @param func    callback function that was set
     * @param context optional `this` that was set
     * @returns this object for chaining
     */
    removeListener(func: (...args: TArgs) => void, context: any = globalThis): this {
        if (this.isCalling) {
            this.commandQueue.push({
                type: CommandType.Remove,
                data: { context, func }
            });
        } else {
            this.removeListenerImpl(func, context);
        }

        return this;
    }

    /**
     * Executes all callbacks asynchronously, executing in order, but resolving freely they finish.
     * The promise resolves once all callbacks have finished. (Uses Promise.all)
     *
     * It's highly recommended to await this function since calling it again during execution will
     * throw as a guard against recursion.
     *
     * @param args arguments to pass to the function
     *
     * @throws DelegateError if delegate is already invoking
     */
    async asyncAll(...args: TArgs): Promise<void> {
        this.preCall();
        const promises: Promise<void>[] = [];
        for (const callback of this.callbacks) {
            promises.push((async () => {
                return callback.func.apply(callback.context, args);
            })());
        }

        await Promise.all(promises);
        this.postCall();
    }

    /**
     * Executes all callbacks, awaiting on each sequentially
     *
     * It's highly recommended to await this function since calling it again during execution will
     * throw as a guard against recursion.
     *
     * @param  args arguments to pass to the function
     *
     * @throws DelegateError if delegate is already invoking
     */
    async asyncSeq(...args: TArgs): Promise<void> {
        this.preCall();
        for (const callback of this.callbacks) {
            await callback.func.apply(callback.context, args);
        }
        this.postCall();
    }

    private preCall(): void {
        if (this.isCalling) {
            throw new DelegateError("Recursion on a Delegate is not allowed",
                DelegateErrorType.RecursiveCall);
        }

        this.isCalling = true;
    }

    private postCall(): void {
        this.isCalling = false;
        this.processCommands();
    }

    /**
     * Fires the callback, called by the proxy
     * @param args
     */
    private invoke(...args: TArgs) {
        this.preCall();

        for (const callback of this.callbacks) {
            callback.func.apply(callback.context, args);
        }

        this.postCall();
    }

    private addListenerImpl(callback: ICallbackWrapper<TArgs>) {
        this.callbacks.push(callback);
    }

    private removeListenerImpl(func: (...args: TArgs) => void, context: any) {
        for (let i = 0; i < this.callbacks.length; ++i) {
            if (callbacksEqual(this.callbacks[i], func, context)) {
                this.callbacks.splice(i, 1);
                break;
            }
        }
    }

    private processCommands() {
        if (this.commandQueue.length === 0) return;

        for (const command of this.commandQueue) {
            switch(command.type) {
                case CommandType.Add:
                    this.addListenerImpl(command.data as ICallbackWrapper<TArgs>);
                break;

                case CommandType.Remove:
                    this.removeListenerImpl(command.data.func, command.data.context);
                break;
            }
        }

        this.commandQueue.length = 0;
    }
}
