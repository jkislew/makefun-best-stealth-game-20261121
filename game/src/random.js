// A small seeded random number generator (mulberry32): the same seed gives the
// same game, which is what makes the screenshot scenes repeatable and the two
// grader runs identical. Nothing in the simulation reads Math.random or the
// wall clock; every wobble below comes from this stream.

export function createRandom(seed) {
  let a = seed | 0;
  return function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A value in [min, max) from a seeded stream. */
export function range(random, min, max) {
  return min + random() * (max - min);
}

/** Pick one entry of an array from a seeded stream. */
export function pick(random, array) {
  return array[Math.floor(random() * array.length)];
}
