import { Effect, UnhandledEffectError, execute, handle } from "../src/index.ts";

class GetStr extends Effect<string> { }
class Random extends Effect<number> { }
const random = Object.freeze(new Random());

function* proc() {
    const a = yield* random;
    const b = yield* new GetStr();

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
        console.log(e.effect);
    }

}