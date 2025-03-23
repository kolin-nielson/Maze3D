class SeededRandom {
  constructor(seed) {
    this.seed = seed;
  }
  next() {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
}
const seededRandom = new SeededRandom(5);

// Choose built in Math.random or myRandom here:
function myRandom() {
  //return Math.random();       // different random every time between 0 and 1.
  return seededRandom.next(); // same random every time
}

function randomIntInclusive(low, high) { // integer low through integer high
  low = Math.ceil(low);
  high = Math.floor(high);
  return Math.floor(myRandom() * (high - low + 1)) + low;
}

function randomIntExclusive(low, high) { // integer low up to but not including high.
  low = Math.ceil(low);
  high = Math.floor(high);
  return Math.floor(myRandom() * (high - low)) + low;
}

function randomDouble(low, high) {
  const scale = high - low;
  const r = myRandom() * scale + low;
  return r;
}

export { randomDouble, randomIntInclusive, randomIntExclusive };