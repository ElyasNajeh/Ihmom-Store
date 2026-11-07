export interface LocalizedOption<Value extends string> {
    value: Value;
    label: string;
}

export function localizeOptions<Value extends string>(
    options: readonly { value: Value; labelKey: string }[],
    translate: (key: string) => string,
): LocalizedOption<Value>[] {
    return options.map(({ value, labelKey }) => ({ value, label: translate(labelKey) }));
}
