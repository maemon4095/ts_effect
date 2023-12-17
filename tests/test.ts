import { Effect, Process, execute, handle } from "../src/index.ts";

class A extends Effect<number> {
    #a: symbol = Symbol();
}

class B extends Effect<string> {
    #b: symbol = Symbol();
}

class Random extends Effect<number> {
    #mark = Symbol();
}

function random(): Random {
    return new Random();
}

function* a() {
    const a = yield* random();
    const b = yield* (new B());

    return b.repeat(a);
}


const b = handle(a()).withPure(Random, _ => Math.random() * 10).withPure(B, _ => "str");

console.log(execute(b));