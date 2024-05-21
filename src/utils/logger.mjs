export function getMinWidth(strings) {
  const longest = strings.reduce((a, b) => (a.length > b.length ? a : b), "");
  return longest.length + 5;
}

export function getPrintable(str, minWidth) {
  // Add 2 because we are adding square brackets
  return `[${str}]`.padEnd(minWidth + 2, ".");
}
