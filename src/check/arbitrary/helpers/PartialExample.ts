import { PartialExample } from '../../runner/configuration/Parameters';
import { Shrinkable } from '../definition/Shrinkable';

/** @internal */
export function wrapWithPartialExample<T>(shrinkable: Shrinkable<T>, mapper: PartialExample<T>): Shrinkable<T> {
  const p = new Proxy<Shrinkable<T>>(shrinkable, {
    get(target, prop, receiver) {
      if (prop === 'shrink') {
        return () => target.shrink().map((s) => wrapWithPartialExample(s, mapper));
      }
      if (prop === 'value' || prop === 'value_') {
        return mapper(target[prop]);
      }
      return Reflect.get(target, prop, receiver);
    },
  });

  return p;
}
