import { Shrinkable } from '../../../../../src/check/arbitrary/definition/Shrinkable';
import { wrapWithPartialExample } from '../../../../../src/check/arbitrary/helpers/PartialExample';
import { Stream, stream } from '../../../../../src/stream/Stream';

describe('PartialExample', () => {
  describe('wrapWithPartialExample', () => {
    function arrangeTest() {
      let value = 1;
      function shrink(): Stream<Shrinkable<number, number>> {
        return stream<unknown>(Array(10).values()).map(() => new Shrinkable(++value, shrink));
      }

      const s = new Shrinkable(value, shrink);
      const mapper = jest.fn(x => x * 10);
      const shrinkableExample = wrapWithPartialExample(s, mapper);

      return { mapper, shrinkableExample };
    }

    it('Should apply mapper on value accessor', () => {
      const { mapper, shrinkableExample } = arrangeTest();
      expect(shrinkableExample.value).toBe(10);
      expect(mapper).toHaveBeenCalledTimes(1);
    });
    it('Should apply mapper on value_ accessor', () => {
      const { mapper, shrinkableExample } = arrangeTest();
      expect(shrinkableExample.value_).toBe(10);
      expect(mapper).toHaveBeenCalledTimes(1);
    });
    it('Should apply mapper after calling [shrink]', () => {
      const { mapper, shrinkableExample } = arrangeTest();
      const shrunkExample = [...shrinkableExample.shrink()][0];
      expect(shrunkExample.value_).toBe(20);
      expect(mapper).toHaveBeenCalledTimes(1);
    });
  });
});
