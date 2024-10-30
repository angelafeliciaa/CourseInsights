// TransformationHelper.ts
import { InsightError, InsightResult } from "../IInsightFacade";
import { Section } from "../Section";
import Decimal from "decimal.js";

type ApplyToken = "MAX" | "MIN" | "AVG" | "COUNT" | "SUM";
type NumericField = "avg" | "pass" | "fail" | "audit" | "year" | "lat" | "lon" | "seats";

interface ApplyRule {
	[applyKey: string]: {
		[token in ApplyToken]?: string;
	};
}

export class TransformationHelper {
	private static isNumericField(field: string): boolean {
		const numericFields: NumericField[] = ["avg", "pass", "fail", "audit", "year", "lat", "lon", "seats"];
		return numericFields.includes(field as NumericField);
	}

	public static validateColumnsWithGrouping(columns: string[], groupKeys: string[], applyRules: ApplyRule[]): void {
		const applyKeys = new Set(applyRules.map((rule) => Object.keys(rule)[0]));

		for (const column of columns) {
			const isGroupKey = groupKeys.includes(column);
			const isApplyKey = applyKeys.has(column);

			if (!isGroupKey && !isApplyKey) {
				throw new InsightError(`Column ${column} must be either a GROUP key or an APPLY key`);
			}
		}
	}

	public static groupData(data: Section[], groupKeys: string[], datasetId: string): Map<string, Section[]> {
		const groups = new Map<string, Section[]>();

		for (const item of data) {
			const groupValues = groupKeys.map((key) => {
				const [id, field] = key.split("_");
				if (id !== datasetId) {
					throw new InsightError(`Invalid dataset ID in group key: ${key}`);
				}
				return `${field}:${item[field as keyof Section]}`;
			});

			const groupKey = groupValues.join("|");
			if (!groups.has(groupKey)) {
				groups.set(groupKey, []);
			}
			groups.get(groupKey)?.push(item);
		}

		return groups;
	}

	public static applyTransformations(
		groupedData: Map<string, Section[]>,
		applyRules: ApplyRule[],
		groupKeys: string[],
		datasetId: string
	): InsightResult[] {
		this.validateApplyRules(applyRules);
		const results: InsightResult[] = [];

		for (const [groupKey, groupItems] of groupedData) {
			const result = this.createGroupResult(groupKey, groupKeys);
			this.applyRulesToGroup(result, groupItems, applyRules, datasetId);
			results.push(result);
		}

		return results;
	}

	private static validateApplyRules(applyRules: ApplyRule[]): void {
		const applyKeySet = new Set<string>();
		for (const rule of applyRules) {
			const applyKey = Object.keys(rule)[0];
			if (applyKeySet.has(applyKey)) {
				throw new InsightError(`Duplicate apply key: ${applyKey}`);
			}
			applyKeySet.add(applyKey);
		}
	}

	private static createGroupResult(groupKey: string, groupKeys: string[]): InsightResult {
		const result: InsightResult = {};
		const groupValues = groupKey.split("|");
		groupKeys.forEach((key, index) => {
			const value = groupValues[index].split(":")[1];
			result[key] = this.parseValue(value);
		});
		return result;
	}

	private static parseValue(value: string): string | number {
		const numberValue = Number(value);
		return isNaN(numberValue) ? value : numberValue;
	}

	private static applyRulesToGroup(
		result: InsightResult,
		groupItems: Section[],
		applyRules: ApplyRule[],
		datasetId: string
	): void {
		for (const rule of applyRules) {
			const applyKey = Object.keys(rule)[0];
			const applySpec = rule[applyKey];
			const token = Object.keys(applySpec)[0] as ApplyToken;
			const field = applySpec[token];

			if (!field) {
				throw new InsightError(`Invalid apply rule specification for ${applyKey}`);
			}

			const [id, fieldName] = field.split("_");
			if (id !== datasetId) {
				throw new InsightError(`Invalid dataset ID in apply rule: ${field}`);
			}

			result[applyKey] = this.calculateApplyResult(token, groupItems, fieldName as keyof Section);
		}
	}

	public static calculateAvg(values: number[]): number {
		let total = new Decimal(0);
		// Step 1: Convert each value to Decimal and add
		values.forEach((value) => {
			total = total.add(new Decimal(value));
		});

		// Step 2: Calculate average with regular division
		const avg = total.toNumber() / values.length;

		// Step 3: Round to 2 decimal places and convert back to number
		return Number(avg.toFixed(2));
	}

	public static calculateSum(values: number[]): number {
		let total = new Decimal(0);
		// Convert each value to Decimal and add
		values.forEach((value) => {
			total = total.add(new Decimal(value));
		});

		// Round to 2 decimal places and convert back to number
		return Number(total.toFixed(2));
	}

	public static calculateMax(values: number[]): number {
		return Math.max(...values);
	}

	public static calculateMin(values: number[]): number {
		return Math.min(...values);
	}

	public static calculateCount(values: any[]): number {
		return new Set(values).size;
	}

	private static calculateApplyResult(token: ApplyToken, items: Section[], field: keyof Section): number {
		const values = items.map((item) => item[field]);

		if (token !== "COUNT") {
			if (!this.isNumericField(field as string)) {
				throw new InsightError(`${token} can only be applied to numeric fields`);
			}
			if (!values.every((value) => typeof value === "number")) {
				throw new InsightError(`Invalid values for ${token} operation`);
			}
		}

		const numericValues = values as number[];
		switch (token) {
			case "MAX":
				return this.calculateMax(numericValues);
			case "MIN":
				return this.calculateMin(numericValues);
			case "AVG":
				return this.calculateAvg(numericValues);
			case "SUM":
				return this.calculateSum(numericValues);
			case "COUNT":
				return this.calculateCount(values);
			default:
				throw new InsightError(`Unsupported apply token: ${token}`);
		}
	}
}
