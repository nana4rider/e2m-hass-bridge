export function formattedPythonDict(record: Record<string, unknown>): string {
  return (
    "{" +
    Object.entries(record)
      .map(([key, value]) => `'${key}':'${String(value)}'`)
      .join(",") +
    "}"
  );
}

export function hex2ascii(hexString: string): string {
  return Buffer.from(hexString, "hex").toString("utf-8");
}

export function reverseKeyValue<T extends Record<string, string | number>>(
  obj: T,
): Record<string, string> {
  const reversed: Record<string, string> = {};

  Object.entries(obj).forEach(([key, value]) => {
    reversed[String(value)] = key;
  });

  return reversed;
}

export function getDecimalPlaces(value: number): number {
  const valueString = value.toString();
  const decimalIndex = valueString.indexOf(".");
  if (decimalIndex === -1) return 0;
  return valueString.length - decimalIndex - 1;
}

export function parseJson<T>(text: string): T {
  return JSON.parse(text) as T;
}
