// QR Code Model 2, versión 4-L. Capacidad: 78 bytes; suficiente para el pase opaco.
const SIZE = 33;
const DATA_CODEWORDS = 80;
const ERROR_CODEWORDS = 20;

function multiply(left: number, right: number) {
  let result = 0;
  for (let i = 7; i >= 0; i -= 1) {
    result = (result << 1) ^ ((result >>> 7) * 0x11d);
    result ^= ((right >>> i) & 1) * left;
  }
  return result;
}

function divisor(degree: number) {
  const result = Array<number>(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i += 1) {
    for (let j = 0; j < degree; j += 1) {
      result[j] = multiply(result[j], root);
      if (j + 1 < degree) result[j] ^= result[j + 1];
    }
    root = multiply(root, 2);
  }
  return result;
}

function remainder(data: number[]) {
  const result = Array<number>(ERROR_CODEWORDS).fill(0);
  const coefficients = divisor(ERROR_CODEWORDS);
  for (const value of data) {
    const factor = value ^ (result.shift() ?? 0);
    result.push(0);
    coefficients.forEach((coefficient, index) => {
      result[index] ^= multiply(coefficient, factor);
    });
  }
  return result;
}

function encode(payload: string) {
  const bytes = Array.from(new TextEncoder().encode(payload));
  if (bytes.length > 78) throw new Error("El pase QR excede la capacidad admitida");
  const bits: number[] = [0, 1, 0, 0];
  for (let i = 7; i >= 0; i -= 1) bits.push((bytes.length >>> i) & 1);
  for (const value of bytes)
    for (let i = 7; i >= 0; i -= 1) bits.push((value >>> i) & 1);
  for (let i = 0; i < Math.min(4, DATA_CODEWORDS * 8 - bits.length); i += 1)
    bits.push(0);
  while (bits.length % 8 !== 0) bits.push(0);
  const data: number[] = [];
  for (let i = 0; i < bits.length; i += 8)
    data.push(parseInt(bits.slice(i, i + 8).join(""), 2));
  for (let pad = 0; data.length < DATA_CODEWORDS; pad += 1)
    data.push(pad % 2 === 0 ? 0xec : 0x11);
  return [...data, ...remainder(data)];
}

export function createQrMatrix(payload: string) {
  const modules = Array.from({ length: SIZE }, () => Array<boolean>(SIZE).fill(false));
  const functions = Array.from({ length: SIZE }, () => Array<boolean>(SIZE).fill(false));
  const setFunction = (x: number, y: number, dark: boolean) => {
    if (x >= 0 && y >= 0 && x < SIZE && y < SIZE) {
      modules[y][x] = dark;
      functions[y][x] = true;
    }
  };
  const finder = (centerX: number, centerY: number) => {
    for (let dy = -4; dy <= 4; dy += 1)
      for (let dx = -4; dx <= 4; dx += 1) {
        const distance = Math.max(Math.abs(dx), Math.abs(dy));
        setFunction(centerX + dx, centerY + dy, distance !== 2 && distance !== 4);
      }
  };
  finder(3, 3);
  finder(SIZE - 4, 3);
  finder(3, SIZE - 4);
  for (let i = 0; i < SIZE; i += 1) {
    if (!functions[6][i]) setFunction(i, 6, i % 2 === 0);
    if (!functions[i][6]) setFunction(6, i, i % 2 === 0);
  }
  for (const centerY of [6, 26])
    for (const centerX of [6, 26]) {
      if (functions[centerY][centerX]) continue;
      for (let dy = -2; dy <= 2; dy += 1)
        for (let dx = -2; dx <= 2; dx += 1)
          setFunction(
            centerX + dx,
            centerY + dy,
            Math.max(Math.abs(dx), Math.abs(dy)) !== 1,
          );
    }
  const formatData = 1 << 3;
  let formatRemainder = formatData << 10;
  for (let i = 14; i >= 10; i -= 1)
    if (((formatRemainder >>> i) & 1) !== 0)
      formatRemainder ^= 0x537 << (i - 10);
  const formatBits = ((formatData << 10) | formatRemainder) ^ 0x5412;
  const formatBit = (index: number) => ((formatBits >>> index) & 1) !== 0;
  for (let i = 0; i <= 5; i += 1) setFunction(8, i, formatBit(i));
  setFunction(8, 7, formatBit(6));
  setFunction(8, 8, formatBit(7));
  setFunction(7, 8, formatBit(8));
  for (let i = 9; i < 15; i += 1) setFunction(14 - i, 8, formatBit(i));
  for (let i = 0; i < 8; i += 1) setFunction(SIZE - 1 - i, 8, formatBit(i));
  for (let i = 8; i < 15; i += 1) setFunction(8, SIZE - 15 + i, formatBit(i));
  setFunction(8, SIZE - 8, true);

  const dataBits = encode(payload).flatMap((value) =>
    Array.from({ length: 8 }, (_, index) => (value >>> (7 - index)) & 1),
  );
  let index = 0;
  for (let right = SIZE - 1; right >= 1; right -= 2) {
    if (right === 6) right -= 1;
    for (let vertical = 0; vertical < SIZE; vertical += 1) {
      const upward = ((right + 1) & 2) === 0;
      const y = upward ? SIZE - 1 - vertical : vertical;
      for (let offset = 0; offset < 2; offset += 1) {
        const x = right - offset;
        if (functions[y][x]) continue;
        const bit = index < dataBits.length && dataBits[index] === 1;
        modules[y][x] = bit !== ((x + y) % 2 === 0);
        index += 1;
      }
    }
  }
  return modules;
}
