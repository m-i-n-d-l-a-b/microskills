import { useState, useEffect, useCallback } from "react";

export function useLocalStorage<T>(key: string, defaultValue: T) {
	const [value, setValue] = useState<T>(() => {
		try {
			const item = window.localStorage.getItem(key);
			return item ? JSON.parse(item) : defaultValue;
		} catch (error) {
			console.warn(`Error reading localStorage key "${key}":`, error);
			return defaultValue;
		}
	});

	const setStoredValue = useCallback(
		(newValue: T | ((prev: T) => T)) => {
			try {
				const valueToStore =
					newValue instanceof Function ? newValue(value) : newValue;
				setValue(valueToStore);
				window.localStorage.setItem(key, JSON.stringify(valueToStore));
			} catch (error) {
				console.warn(`Error setting localStorage key "${key}":`, error);
			}
		},
		[key, value],
	);

	const removeValue = useCallback(() => {
		try {
			window.localStorage.removeItem(key);
			setValue(defaultValue);
		} catch (error) {
			console.warn(`Error removing localStorage key "${key}":`, error);
		}
	}, [key, defaultValue]);

	return [value, setStoredValue, removeValue] as const;
}
