export const getLocalStorageItem = (key: string) => JSON.parse(localStorage.getItem(key) || '')
export const setLocalStorageItem = (key: string, value: string | object) =>
  localStorage.setItem(key, JSON.stringify(value))
