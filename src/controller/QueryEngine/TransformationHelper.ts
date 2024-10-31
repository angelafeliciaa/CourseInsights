// // from llm
// import { InsightError, InsightResult } from "../IInsightFacade";
// import Decimal from "decimal.js";

// export class TransformationHelper {
// 	private static numericFields = new Set(["avg", "pass", "fail", "audit", "year", "lat", "lon", "seats"]);

// 	public static transform(data: InsightResult[], group: string[], apply: any[]): InsightResult[] {
// 		const groupedData = this.groupData(data, group);
// 		return this.applyTransformations(groupedData, apply);
// 	}

// 	private static groupData(data: InsightResult[], groupKeys: string[]): Map<string, InsightResult[]> {
// 		const groups = new Map<string, InsightResult[]>();

// 		for (const item of data) {
// 			// Create a key from the group values
// 			const key = groupKeys.map((k) => `${k}:${item[k]}`).join("|");

// 			if (!groups.has(key)) {
// 				groups.set(key, []);
// 			}
// 			groups.get(key)?.push(item);
// 		}

// 		return groups;
// 	}

// 	private static applyTransformations(groups: Map<string, InsightResult[]>, applyRules: any[]): InsightResult[] {
// 		const results: InsightResult[] = [];

// 		groups.forEach((groupData, key) => {
// 			const result: InsightResult = {};

// 			// Restore group keys to result
// 			const groupPairs = key.split("|");
// 			for (const pair of groupPairs) {
// 				const [field, value] = pair.split(":");
// 				result[field] = isNaN(Number(value)) ? value : Number(value);
// 			}

// 			// Apply transformations
// 			for (const rule of applyRules) {
// 				const applyKey = Object.keys(rule)[0];
// 				const operation = Object.keys(rule[applyKey])[0];
// 				const field = rule[applyKey][operation].split("_")[1];

// 				if (operation !== "COUNT" && !this.numericFields.has(field)) {
// 					throw new InsightError(`Field ${field} must be numeric for ${operation} operation`);
// 				}

// 				const values = groupData.map((item) => item[field]);
// 				result[applyKey] = this.performCalculation(operation, values);
// 			}

// 			results.push(result);
// 		});

// 		return results;
// 	}

// 	private static performCalculation(operation: string, values: any[]): number {
// 		switch (operation) {
// 			case "MAX":
// 				return this.calculateMax(values as number[]);
// 			case "MIN":
// 				return this.calculateMin(values as number[]);
// 			case "AVG":
// 				return this.calculateAvg(values as number[]);
// 			case "SUM":
// 				return this.calculateSum(values as number[]);
// 			case "COUNT":
// 				return this.calculateCount(values);
// 			default:
// 				throw new InsightError(`Unknown operation: ${operation}`);
// 		}
// 	}

// 	public static calculateAvg(values: number[]): number {
// 		let total = new Decimal(0);
// 		// Step 1: Convert each value to Decimal and add
// 		values.forEach((value) => {
// 			total = total.add(new Decimal(value));
// 		});
// 		// Step 2: Calculate average with regular division
// 		const avg = total.toNumber() / values.length;
// 		// Step 3: Round to 2 decimal places and convert back to number
// 		return Number(avg.toFixed(2));
// 	}

// 	public static calculateSum(values: number[]): number {
// 		let total = new Decimal(0);
// 		// Convert each value to Decimal and add
// 		values.forEach((value) => {
// 			total = total.add(new Decimal(value));
// 		});
// 		// Round to 2 decimal places and convert back to number
// 		return Number(total.toFixed(2));
// 	}

// 	public static calculateMax(values: number[]): number {
// 		return Math.max(...values);
// 	}

// 	public static calculateMin(values: number[]): number {
// 		return Math.min(...values);
// 	}

// 	public static calculateCount(values: any[]): number {
// 		return new Set(values).size;
// 	}
// }
