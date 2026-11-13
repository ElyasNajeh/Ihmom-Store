function createRandomGenerator(seed: number) {
    let state = Math.abs(seed % 2147483646) + 1;

    return () => {
        state = (state * 16807) % 2147483647;
        return (state - 1) / 2147483646;
    };
}

export function shuffleArray<T>(items: readonly T[], seed: number): T[] {
    const result = [...items];
    const random = createRandomGenerator(seed);

    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));

        [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
}
