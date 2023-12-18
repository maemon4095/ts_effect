export type Process<T, E extends Effect<unknown> = Effect<unknown>> = { [Symbol.iterator](): Iterator<E, T, unknown>; };
export type EffectHandler<E0 extends Effect<unknown>, T, E1 extends Effect<T>> = (effect: E0) => Process<T, E1>;
export type PureEffectHandler<E extends Effect<unknown>, T> = (effect: E) => T;

type BothEffectHandler<E0 extends Effect<unknown>, T, E1 extends Effect<T>> =
    { type: "pure"; handler: PureEffectHandler<E0, T>; } |
    { type: "eff"; handler: EffectHandler<E0, T, E1>; };

type ProcessResult<P extends Process<unknown>> = P extends Process<infer X> ? X : never;

export class Handle<T, E extends Effect<unknown>> implements Process<T, E> {
    #process: Process<T>;
    // deno-lint-ignore ban-types
    #handlers: Map<Function, BothEffectHandler<Effect<unknown>, unknown, Effect<unknown>>>;
    // deno-lint-ignore ban-types
    constructor(process: Process<T>, handlers: Map<Function, BothEffectHandler<Effect<unknown>, unknown, Effect<unknown>>>) {
        this.#process = process;
        this.#handlers = handlers;
    }

    [Symbol.iterator]() {
        type This = typeof this;
        function* body(self: This) {
            const iter = self.#process[Symbol.iterator]();
            let handleResult: unknown = undefined;
            while (true) {
                const { done, value } = iter.next(handleResult);
                if (done) {
                    return value;
                }

                const pair = self.#handlers.get(value.constructor);
                if (pair === undefined) {
                    handleResult = yield* value as E;
                    continue;
                }

                if (pair.type === "eff") {
                    const result = yield* pair.handler(value) as E;
                    handleResult = result;
                } else {
                    handleResult = pair.handler(value);
                }
            }
        }

        return body(this);
    }

    with<E1 extends E, T1, E2 extends Effect<T1>>(ctor: abstract new (...args: unknown[]) => E1, handler: EffectHandler<E1, T1, E2>) {
        const handlers = new Map(this.#handlers);
        // deno-lint-ignore no-explicit-any
        handlers.set(ctor, { type: "eff", handler: handler as unknown as any });

        return new Handle<T, Exclude<E, E1> | E2>(this.#process, handlers);
    }

    withPure<E1 extends E>(ctor: abstract new (...args: unknown[]) => E1, handler: (e: E1) => ProcessResult<E1>) {
        const handlers = new Map(this.#handlers);
        // deno-lint-ignore no-explicit-any
        handlers.set(ctor, { type: "pure", handler: handler as unknown as any });

        return new Handle<T, Exclude<E, E1>>(this.#process, handlers);
    }
}

export function handle<T, E extends Effect<unknown>>(process: Process<T, E>) {
    return new Handle<T, E>(process, new Map());
}

export abstract class Effect<T> {
    [Symbol.iterator]() {
        type This = typeof this;
        function* body(self: This) {
            const ret: T = yield self;
            return ret;
        }
        return body(this);
    }
}


export class UnhandledEffectError extends Error {
    #effect;
    constructor(effect: Effect<unknown>) {
        super();
        this.#effect = effect;
    }

    get effect() {
        return this.#effect;
    }
}

export function execute<T>(process: Process<T, never>): T {
    const iter = process[Symbol.iterator]();
    const { done, value } = iter.next();
    if (done) {
        return value;
    }

    throw new UnhandledEffectError(value);
}
