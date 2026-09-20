export function encodeBmp(pixels, width, height) {
  const rowSize = Math.ceil((width * 3) / 4) * 4;
  const pixelBytes = rowSize * height;
  const buffer = new Uint8Array(54 + pixelBytes);
  const view = new DataView(buffer.buffer);

  buffer[0] = 0x42;
  buffer[1] = 0x4d;
  view.setUint32(2, buffer.length, true);
  view.setUint32(10, 54, true);
  view.setUint32(14, 40, true);
  view.setInt32(18, width, true);
  view.setInt32(22, height, true);
  view.setUint16(26, 1, true);
  view.setUint16(28, 24, true);
  view.setUint32(30, 0, true);
  view.setUint32(34, pixelBytes, true);
  view.setInt32(38, 3780, true);
  view.setInt32(42, 3780, true);

  for (let y = 0; y < height; y += 1) {
    const sourceY = height - y - 1;
    const rowOffset = 54 + y * rowSize;
    for (let x = 0; x < width; x += 1) {
      const sourceOffset = (sourceY * width + x) * 4;
      const targetOffset = rowOffset + x * 3;
      const alpha = pixels[sourceOffset + 3] / 255;
      const red = Math.round(pixels[sourceOffset] * alpha + 255 * (1 - alpha));
      const green = Math.round(pixels[sourceOffset + 1] * alpha + 255 * (1 - alpha));
      const blue = Math.round(pixels[sourceOffset + 2] * alpha + 255 * (1 - alpha));
      buffer[targetOffset] = blue;
      buffer[targetOffset + 1] = green;
      buffer[targetOffset + 2] = red;
    }
  }

  return buffer;
}
