// AggregationHelper.ts from llm

import Decimal from "decimal.js";

export class AggregationHelper {
	/**
	 * Calculates the average of an array of numbers.
	 * @param values - Array of numerical values.
	 * @returns The average rounded to two decimal places.
	 */
	public static calculateAvg(values: number[]): number {
		if (values.length === 0) {
			throw new Error("Cannot calculate average of an empty array.");
		}

		let total = new Decimal(0);
		for (const value of values) {
			const decimalValue = new Decimal(value);
			total = total.add(decimalValue);
		}
		const avg = total.toNumber() / values.length;
		const decimalPlace = 2;
		return Number(new Decimal(avg).toFixed(decimalPlace));
	}

	/**
	 * Calculates the sum of an array of numbers.
	 * @param values - Array of numerical values.
	 * @returns The sum rounded to two decimal places.
	 */
	public static calculateSum(values: number[]): number {
		let total = new Decimal(0);
		for (const value of values) {
			const decimalValue = new Decimal(value);
			total = total.add(decimalValue);
		}
		const decimalPlace = 2;
		return Number(total.toFixed(decimalPlace));
	}

	/**
	 * Finds the minimum value in an array of numbers.
	 * @param values - Array of numerical values.
	 * @returns The minimum number.
	 */
	public static calculateMin(values: number[]): number {
		if (values.length === 0) {
			throw new Error("Cannot calculate minimum of an empty array.");
		}
		return Math.min(...values);
	}

	/**
	 * Finds the maximum value in an array of numbers.
	 * @param values - Array of numerical values.
	 * @returns The maximum number.
	 */
	public static calculateMax(values: number[]): number {
		if (values.length === 0) {
			throw new Error("Cannot calculate maximum of an empty array.");
		}
		return Math.max(...values);
	}

	/**
	 * Counts the number of unique values in an array.
	 * @param values - Array of values (can be numbers or strings).
	 * @returns The count of unique values.
	 */
	public static calculateCount(values: any[]): number {
		return new Set(values).size;
	}
}
