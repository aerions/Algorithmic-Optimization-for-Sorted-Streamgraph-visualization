
function generateData(dataCount = 10, mod = 10) {
  const data = new Array(dataCount).fill(0).map(() => new Array(2).fill(0).map(() => {
    return Math.floor(Math.random() * mod) + 1;
  }));
  return data;
}
