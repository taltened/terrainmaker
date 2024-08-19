import { HKT, Kind, Kind2, Kind3, Kind4, URIS, URIS2, URIS3, URIS4 } from 'fp-ts/HKT';
import {
  Applicative,
  Applicative1,
  Applicative2,
  Applicative2C,
  Applicative3,
  Applicative3C,
  Applicative4,
} from 'fp-ts/Applicative';
import { sequence as sequenceRA } from 'fp-ts/lib/ReadonlyArray';

type Tuple = readonly [...unknown[]];
type TupleM<M, A extends Tuple> = {
  readonly [K in keyof A]: HKT<M, A[K]>;
} & { 'length': A['length'] };

type Tuple1<F extends URIS, A extends Tuple> = {
  readonly [K in keyof A]: Kind<F, A[K]>;
} & { length: A['length'] };

type Tuple2<F extends URIS2, E, A extends Tuple> = {
  readonly [K in keyof A]: Kind2<F, E, A[K]>;
} & { length: A['length'] };

type Tuple3<F extends URIS3, R, E, A extends Tuple> = {
  readonly [K in keyof A]: Kind3<F, R, E, A[K]>;
} & { length: A['length'] };

type Tuple4<F extends URIS4, S, R, E, A extends Tuple> = {
  readonly [K in keyof A]: Kind4<F, S, R, E, A[K]>;
} & { length: A['length'] };

export const uri = 'variadic';
export type URI = typeof uri;

declare module 'fp-ts/HKT' {
  interface URItoKind<A> {
    readonly [uri]: A extends Tuple ? A : never;
  }
}

interface Sequence1<T extends URIS> {
  <F extends URIS4>(F: Applicative4<F>): <S, R, E, A extends Tuple>(ta: Tuple4<F, S, R, E, A>) => Kind4<F, S, R, E, Kind<T, A>>;
  <F extends URIS3>(F: Applicative3<F>): <R, E, A extends Tuple>(ta: Tuple3<F, R, E, A>) => Kind3<F, R, E, Kind<T, A>>;
  <F extends URIS3, E>(F: Applicative3C<F, E>): <R, A extends Tuple>(ta: Tuple3<F, R, E, A>) => Kind3<F, R, E, Kind<T, A>>;
  <F extends URIS2>(F: Applicative2<F>): <E, A extends Tuple>(ta: Tuple2<F, E, A>) => Kind2<F, E, Kind<T, A>>;
  <F extends URIS2, E>(F: Applicative2C<F, E>): <A extends Tuple>(ta: Tuple2<F, E, A>) => Kind2<F, E, Kind<T, A>>;
  <F extends URIS>(F: Applicative1<F>): <A extends Tuple>(ta: Tuple1<F, A>) => Kind<F, Kind<T, A>>;
  <F>(F: Applicative<F>): <A extends Tuple>(ta: TupleM<F,A>) => HKT<F,A>;
}

export const sequence: Sequence1<URI> =
  <F>(f: Applicative<F>) =>
  <A extends Tuple>(ta: TupleM<F,A>): HKT<F,A> =>
  sequenceRA(f)(ta) as HKT<F,A>;
