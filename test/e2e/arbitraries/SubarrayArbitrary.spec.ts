import * as assert from 'assert';
import * as fc from '../../../src/fast-check';

const src = [1, 25, 42, 0, -12];
const seed = Date.now();
describe(`SubarrayArbitrary (seed: ${seed})`, () => {
  describe('subarray', () => {
    it('Should not re-order the values', () => {
      fc.assert(
        fc.property(fc.subarray(src), (arr: number[]) => {
          const correspondingIndexes = arr.map(v => src.indexOf(v));
          let prev = -1;
          for (const item of correspondingIndexes) {
            if (item <= prev) return false; // wrongly ordered or duplicated
            prev = item;
          }
          return true;
        }),
        { seed: seed }
      );
    });
    it('Should be able to shrink to the minimal counterexample', () => {
      const out = fc.check(
        fc.property(fc.subarray(src), (arr: number[]) => arr.indexOf(src[0]) === -1 || arr.indexOf(src[3]) === -1),
        { seed: seed }
      );
      assert.ok(out.failed);
      assert.deepEqual(out.counterexample, [[src[0], src[3]]]);
    });
  });
  describe('shuffledSubarray', () => {
    it('Should be able to shrink to counterexample restricted to an inverted pair', () => {
      const out = fc.check(
        fc.property(fc.shuffledSubarray(src), (arr: number[]) => {
          const correspondingIndexes = arr.map(v => src.indexOf(v));
          let prev = -1;
          for (const item of correspondingIndexes) {
            if (item <= prev) return false; // wrongly ordered or duplicated
            prev = item;
          }
          return true;
        }),
        { seed: seed }
      );
      assert.ok(out.failed);
      assert.equal(out.counterexample![0].length, 2);
      assert.ok(src.indexOf(out.counterexample![0][0]) > src.indexOf(out.counterexample![0][1]));
    });
  });
});
