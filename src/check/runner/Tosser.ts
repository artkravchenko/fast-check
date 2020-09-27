import * as prand from 'pure-rand';

import { Random } from '../../random/generator/Random';
import { Shrinkable } from '../arbitrary/definition/Shrinkable';
import { wrapWithPartialExample } from '../arbitrary/helpers/PartialExample';
import { IRawProperty } from '../property/IRawProperty';
import { PartialExample } from './configuration/Parameters';

/** @internal */
function lazyGenerate<Ts>(
  generator: IRawProperty<Ts>,
  rng: prand.RandomGenerator,
  idx: number,
  partialExample?: PartialExample<Ts>
): () => Shrinkable<Ts> {
  return () => {
    const values = generator.generate(new Random(rng), idx);
    if (!partialExample) {
      return values;
    }
    return wrapWithPartialExample(values, partialExample);
  };
}

/** @internal */
export function* toss<Ts>(
  generator: IRawProperty<Ts>,
  seed: number,
  random: (seed: number) => prand.RandomGenerator,
  examples: Ts[],
  partialExamples: PartialExample<Ts>[],
): IterableIterator<() => Shrinkable<Ts>> {
  yield* examples.map((e) => () => new Shrinkable(e));
  let idx = 0;
  let rng = random(seed);
  let partialExample: PartialExample<Ts> | undefined;
  for (;;) {
    rng = rng.jump ? rng.jump() : prand.skipN(rng, 42);
    partialExample = idx < partialExamples.length ? partialExamples[idx] : undefined;
    yield lazyGenerate(generator, rng, idx++, partialExample);
  }
}
