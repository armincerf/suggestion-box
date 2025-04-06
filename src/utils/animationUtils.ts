export function easeInOutQuint(value: number) {
    if (value < 0.5) {
        return 16 * value * value * value * value * value;
    }
    const t = value - 1;
    return 1 + 16 * t * t * t * t * t;
}