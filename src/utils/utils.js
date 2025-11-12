export function mapValue(value, fromMin, fromMax, toMin, toMax) {
    if (value < fromMin) {
      value = fromMin;
    } else if (value > fromMax) {
      value = fromMax;
    }
    const percentage = (value - fromMin) / (fromMax - fromMin);
    const mappedValue = toMin + percentage * (toMax - toMin);
    return mappedValue;
  }

export function getRandomDeepColor() {
    const r = Math.floor(Math.random() * 128); // Red component between 0 and 127
    const g = Math.floor(Math.random() * 128); // Green component between 0 and 127
    const b = Math.floor(Math.random() * 128); // Blue component between 0 and 127
    return (r << 16) | (g << 8) | b; // Shift and combine RGB values
}