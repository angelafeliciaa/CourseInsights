// FilterHelper.ts

import { InsightError } from "./IInsightFacade";
import { Section } from "./Section";

type NumericSectionField = "avg" | "pass" | "fail" | "audit" | "year";
type StringSectionField = "dept" | "id" | "instructor" | "title" | "uuid";

export class FilterHelper {
	public applyWhereClause(data: Section[], where: any, datasetId: string): Section[] {
		if (Object.keys(where).length === 0) {
			return data; // Return all data if WHERE is empty
		}

		const key = Object.keys(where)[0];
		switch (key) {
			case "AND":
				return this.applyAnd(data, where[key], datasetId);
			case "OR":
				return this.applyOr(data, where[key], datasetId);
			case "NOT":
				return this.applyNot(data, where[key], datasetId);
			case "LT":
			case "GT":
			case "EQ":
				return this.applyMComparator(data, key, where[key], datasetId);
			case "IS":
				return this.applySComparator(data, where[key], datasetId);
			default:
				throw new InsightError("Invalid WHERE clause.");
		}
	}

	private applyAnd(data: Section[], conditions: any[], datasetId: string): Section[] {
		if (!Array.isArray(conditions) || conditions.length === 0) {
			throw new InsightError("AND conditions must be a non-empty array.");
		}
		return conditions.reduce((result, condition) => this.applyWhereClause(result, condition, datasetId), data);
	}

	private applyOr(data: Section[], conditions: any[], datasetId: string): Section[] {
		if (!Array.isArray(conditions) || conditions.length === 0) {
			throw new InsightError("OR conditions must be a non-empty array.");
		}
		const resultSet = new Set<Section>();
		for (const condition of conditions) {
			const result = this.applyWhereClause(data, condition, datasetId);
			result.forEach((item) => resultSet.add(item));
		}
		return Array.from(resultSet);
	}

	private applyNot(data: Section[], condition: any, datasetId: string): Section[] {
		const matching = this.applyWhereClause(data, condition, datasetId);
		return data.filter((item) => !matching.includes(item));
	}

	private applyMComparator(data: Section[], comparator: string, mComparator: any, datasetId: string): Section[] {
		const mKey = Object.keys(mComparator)[0];
		const value = mComparator[mKey];
		if (typeof value !== "number") {
			throw new InsightError("MComparator value must be a number.");
		}

		const [id, fieldStr] = mKey.split("_");
		if (id !== datasetId) {
			throw new InsightError("MComparator key must reference the correct dataset.");
		}

		const validFields: NumericSectionField[] = ["avg", "pass", "fail", "audit", "year"]; // Use shorthand array syntax
		if (!validFields.includes(fieldStr as NumericSectionField)) {
			throw new InsightError("Invalid field in MComparator.");
		}

		const field = fieldStr as NumericSectionField;

		return data.filter((item) => {
			const itemValue = item[field]; // TypeScript now knows itemValue is a number
			switch (comparator) {
				case "LT":
					return itemValue < value;
				case "GT":
					return itemValue > value;
				case "EQ":
					return itemValue === value;
				default:
					throw new InsightError("Invalid comparator.");
			}
		});
	}

	private applySComparator(data: Section[], sComparator: any, datasetId: string): Section[] {
		const sKey = Object.keys(sComparator)[0];
		const value = sComparator[sKey];
		if (typeof value !== "string") {
			throw new InsightError("SComparator value must be a string.");
		}

		const [id, fieldStr] = sKey.split("_");
		if (id !== datasetId) {
			throw new InsightError("SComparator key must reference the correct dataset.");
		}

		const validFields: StringSectionField[] = ["dept", "id", "instructor", "title", "uuid"];
		if (!validFields.includes(fieldStr as StringSectionField)) {
			throw new InsightError("Invalid field in SComparator.");
		}

		if (this.isInvalidPattern(value)) {
			throw new InsightError("Invalid wildcard usage in IS.");
		}

		const field = fieldStr as StringSectionField;

		return data.filter((item) => this.matches(item[field], value));
	}

	private matches(itemValue: string, pattern: string): boolean {
		// Handle wildcards at the start and/or end
		let regexString = "^";
		const escapedPattern = this.escapeRegExp(pattern.replace(/\*/g, ""));
		if (pattern.startsWith("*")) {
			regexString += ".*";
		}
		regexString += escapedPattern;
		if (pattern.endsWith("*")) {
			regexString += ".*";
		}
		regexString += "$";
		const regex = new RegExp(regexString);
		return regex.test(itemValue);
	}

	private isInvalidPattern(pattern: string): boolean {
		const firstIndex = pattern.indexOf("*");
		const lastIndex = pattern.lastIndexOf("*");
		if (firstIndex !== -1 && firstIndex !== 0 && lastIndex !== pattern.length - 1) {
			// '*' in the middle is invalid
			return true;
		}
		if (pattern.slice(1, -1).includes("*")) {
			// Multiple '*' in the middle is invalid
			return true;
		}
		return false;
	}

	private escapeRegExp(string: string): string {
		return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	}
}
