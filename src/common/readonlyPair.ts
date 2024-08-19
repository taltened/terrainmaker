export type ReadonlyPair<T> = readonly [T, T];

export const mapBoth: <A, B>(f: (a: A) => B) => (fa: ReadonlyPair<A>) => ReadonlyPair<B> =
(f) => (fa) => [f(fa[0]), f(fa[1])];
