import { Effect, UnhandledEffectError, execute, handle } from "../src/index.ts";

class GetStr extends Effect<string> { }
class Random extends Effect<number> { }
const random = Object.freeze(new Random());
const getstr = Object.freeze(new GetStr());

function* proc() {
    const a = yield* random;
    const b = yield* getstr;

    return b.repeat(a * 10);
}
const pureProc =
    handle(proc())
        .withPure(Random, _ => Math.random())
        .withPure(GetStr, _ => "str");

try {
    console.log(execute(pureProc));
} catch (e) {
    if (e instanceof UnhandledEffectError) {
        console.log("unhandled effect:", e.effect);
    } else {
        console.log("unexpected error:", e);
    }
}