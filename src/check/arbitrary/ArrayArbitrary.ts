import { Random } from '../../random/generator/Random';
import { Stream } from '../../stream/Stream';
import { cloneMethod } from '../symbols';
import { Arbitrary } from './definition/Arbitrary';
import { ArbitraryWithShrink } from './definition/ArbitraryWithShrink';
import { biasWrapper } from './definition/BiasedArbitraryWrapper';
import { Shrinkable } from './definition/Shrinkable';
import { integer } from './IntegerArbitrary';
import { makeLazy } from '../../stream/LazyIterableIterator';

/** @internal */
export class ArrayArbitrary<T> extends Arbitrary<T[]> {
  readonly lengthArb: ArbitraryWithShrink<number>;
  constructor(
    readonly arb: Arbitrary<T>,
    readonly minLength: number,
    readonly maxLength: number,
    readonly preFilter: (tab: Shrinkable<T>[]) => Shrinkable<T>[] = (tab) => tab
  ) {
    super();
    this.lengthArb = integer(minLength, maxLength);
  }
  private static makeItCloneable<T>(vs: T[], shrinkables: Shrinkable<T>[]) {
    (vs as any)[cloneMethod] = () => {
      const cloned = [];
      for (let idx = 0; idx !== shrinkables.length; ++idx) {
        cloned.push(shrinkables[idx].value); // push potentially cloned values
      }
      this.makeItCloneable(cloned, shrinkables);
      return cloned;
    };
    return vs;
  }
  private wrapper(itemsRaw: Shrinkable<T>[], shrunkOnce: boolean): Shrinkable<T[]> {
    const items = this.preFilter(itemsRaw);
    let cloneable = false;
    const vs = [];
    for (let idx = 0; idx !== items.length; ++idx) {
      const s = items[idx];
      cloneable = cloneable || s.hasToBeCloned;
      vs.push(s.value);
    }
    if (cloneable) {
      ArrayArbitrary.makeItCloneable(vs, items);
    }
    return new Shrinkable(vs, () => this.shrinkImpl(items, shrunkOnce).map((v) => this.wrapper(v, true)));
  }
  generate(mrng: Random): Shrinkable<T[]> {
    const size = this.lengthArb.generate(mrng);
    const items: Shrinkable<T>[] = [];
    for (let idx = 0; idx !== size.value; ++idx) {
      items.push(this.arb.generate(mrng));
    }
    return this.wrapper(items, false);
  }
  private shrinkImpl(items: Shrinkable<T>[], shrunkOnce: boolean): Stream<Shrinkable<T>[]> {
    if (items.length === 0) {
      return Stream.nil<Shrinkable<T>[]>();
    }
    const size = this.lengthArb.shrinkableFor(items.length, shrunkOnce);
    return size
      .shrink()
      .map((l) => items.slice(items.length - l.value))
      .join(items[0].shrink().map((v) => [v].concat(items.slice(1))))
      .join(
        items.length > this.minLength
          ? makeLazy(() =>
              this.shrinkImpl(items.slice(1), false)
                .filter((vs) => this.minLength <= vs.length + 1)
                .map((vs) => [items[0]].concat(vs))
            )
          : Stream.nil<Shrinkable<T>[]>()
      );
  }
  withBias(freq: number): Arbitrary<T[]> {
    return biasWrapper(freq, this, (originalArbitrary: ArrayArbitrary<T>) => {
      const lowBiased = new ArrayArbitrary(
        originalArbitrary.arb.withBias(freq),
        originalArbitrary.minLength,
        originalArbitrary.maxLength,
        originalArbitrary.preFilter
      );
      const highBiasedArbBuilder = () => {
        return originalArbitrary.minLength !== originalArbitrary.maxLength
          ? new ArrayArbitrary(
              originalArbitrary.arb.withBias(freq),
              originalArbitrary.minLength,
              originalArbitrary.minLength +
                Math.floor(Math.log(originalArbitrary.maxLength - originalArbitrary.minLength) / Math.log(2)),
              originalArbitrary.preFilter
            )
          : new ArrayArbitrary(
              originalArbitrary.arb.withBias(freq),
              originalArbitrary.minLength,
              originalArbitrary.maxLength,
              originalArbitrary.preFilter
            );
      };
      return biasWrapper(freq, lowBiased, highBiasedArbBuilder);
    });
  }
}

/**
 * Compute `maxLength` based on `minLength`
 * @internal
 */
export function maxLengthFromMinLength(minLength: number): number {
  return 2 * minLength + 10;
}

/**
 * Constraints to be applied on {@link array}
 * @public
 */
export interface ArrayConstraints {
  /** Lower bound of the generated array size */
  minLength?: number;
  /** Upper bound of the generated array size */
  maxLength?: number;
}

/**
 * For arrays of values coming from `arb`
 * @param arb - Arbitrary used to generate the values inside the array
 * @public
 */
function array<T>(arb: Arbitrary<T>): Arbitrary<T[]>;
/**
 * For arrays of values coming from `arb` having an upper bound size
 *
 * @param arb - Arbitrary used to generate the values inside the array
 * @param maxLength - Upper bound of the generated array size
 *
 * @remarks
 * Superceded by `fc.array(arb, {maxLength})` - see {@link https://github.com/dubzzz/fast-check/issues/992 | #992}.
 * Ease the migration with {@link https://github.com/dubzzz/fast-check/tree/master/codemods/unify-signatures | our codemod script}.
 *
 * @public
 */
function array<T>(arb: Arbitrary<T>, maxLength: number): Arbitrary<T[]>;
/**
 * For arrays of values coming from `arb` having lower and upper bound size
 *
 * @param arb - Arbitrary used to generate the values inside the array
 * @param minLength - Lower bound of the generated array size
 * @param maxLength - Upper bound of the generated array size
 *
 * @remarks
 * Superceded by `fc.array(arb, {minLength, maxLength})` - see {@link https://github.com/dubzzz/fast-check/issues/992 | #992}.
 * Ease the migration with {@link https://github.com/dubzzz/fast-check/tree/master/codemods/unify-signatures | our codemod script}.
 *
 * @public
 */
function array<T>(arb: Arbitrary<T>, minLength: number, maxLength: number): Arbitrary<T[]>;
/**
 * For arrays of values coming from `arb` having lower and upper bound size
 * @param arb - Arbitrary used to generate the values inside the array
 * @param constraints - Constraints to apply when building instances
 * @public
 */
function array<T>(arb: Arbitrary<T>, constraints: ArrayConstraints): Arbitrary<T[]>;
function array<T>(arb: Arbitrary<T>, ...args: [] | [number] | [number, number] | [ArrayConstraints]): Arbitrary<T[]> {
  // fc.array(arb)
  if (args[0] === undefined) return new ArrayArbitrary<T>(arb, 0, maxLengthFromMinLength(0));
  // fc.array(arb, constraints)
  if (typeof args[0] === 'object') {
    const minLength = args[0].minLength || 0;
    const specifiedMaxLength = args[0].maxLength;
    const maxLength = specifiedMaxLength !== undefined ? specifiedMaxLength : maxLengthFromMinLength(minLength);
    return new ArrayArbitrary<T>(arb, minLength, maxLength);
  }
  // fc.array(arb, minLength, maxLength)
  if (args[1] !== undefined) return new ArrayArbitrary<T>(arb, args[0], args[1]);
  // fc.array(arb, maxLength)
  return new ArrayArbitrary<T>(arb, 0, args[0]);
}

export { array };
