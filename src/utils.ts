export function isNil(val: any): boolean {
  return val === null || val === undefined;
}

export function isFunction(val: any): boolean {
  return typeof val === 'function';
}
