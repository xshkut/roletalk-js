export function numberToBuffer(num: number): Buffer {
  let arr = [];
  arr.push(num % 256);
  let i = 1;
  while (num >= 256 ** i) {
    arr.push(Math.floor((num % 256 ** (i + 1)) / 256 ** i));
    i++;
  }
  arr.reverse();
  return Buffer.from(arr);
}

export function bufferToNumber(buffer: Buffer) {
  return buffer.reverse().reduce((prev, curr, i) => {
    return prev + curr * 256 ** i;
  });
}
