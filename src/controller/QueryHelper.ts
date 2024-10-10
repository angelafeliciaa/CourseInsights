// QueryHelper.ts got from llm

import { InsightError, InsightResult } from "./IInsightFacade";
import { Section } from "./Section"; // Assuming Section class is in Section.ts

type NumericSectionField = "avg" | "pass" | "fail" | "audit" | "year";
type StringSectionField = "dept" | "id" | "instructor" | "title" | "uuid";
// type SectionField = NumericSectionField | StringSectionField;

export class QueryHelper {
	private existingDatasetIds: string[];
	private datasets: Map<string, Section[]>;

	constructor(existingDatasetIds: string[], datasets: Map<string, Section[]>) {
		this.existingDatasetIds = existingDatasetIds;
		this.datasets = datasets;
	}

	public checkValidQuery(query: any): boolean {
		if (typeof query !== "object" || query === null || Array.isArray(query)) {
			throw new InsightError("Query must be a non-null object.");
		}
		if (!("WHERE" in query) || !("OPTIONS" in query)) {
			throw new InsightError("Query must contain both WHERE and OPTIONS blocks.");
		}
		if (typeof query.WHERE !== "object" || query.WHERE === null || Array.isArray(query.WHERE)) {
			throw new InsightError("WHERE must be a non-null object.");
		}
		if (typeof query.OPTIONS !== "object" || query.OPTIONS === null || Array.isArray(query.OPTIONS)) {
			throw new InsightError("OPTIONS must be a non-null object.");
		}
		if (!("COLUMNS" in query.OPTIONS)) {
			throw new InsightError("OPTIONS must contain COLUMNS.");
		}
		if (!Array.isArray(query.OPTIONS.COLUMNS) || query.OPTIONS.COLUMNS.length === 0) {
			throw new InsightError("COLUMNS must be a non-empty array.");
		}
		// Additional validation for ORDER can be added here
		return true;
	}

	public getDatasetIdFromQuery(query: any): string {
		const datasetIds = new Set<string>();

		// Extract dataset IDs from COLUMNS
		const columns = query.OPTIONS.COLUMNS;
		for (const key of columns) {
			if (typeof key !== "string") {
				throw new InsightError("COLUMNS contains invalid key.");
			}
			const [id] = key.split("_");
			datasetIds.add(id);
		}

		// Extract dataset IDs from WHERE
		this.extractDatasetIdsFromWhere(query.WHERE, datasetIds);

		if (datasetIds.size !== 1) {
			throw new InsightError("Query references multiple datasets.");
		}

		return datasetIds.values().next().value;
	}

	private extractDatasetIdsFromWhere(where: any, datasetIds: Set<string>): void {
		if (Object.keys(where).length === 0) {
			return;
		}

		const key = Object.keys(where)[0];
		if (["AND", "OR"].includes(key)) {
			const conditions = where[key];
			if (!Array.isArray(conditions) || conditions.length === 0) {
				throw new InsightError(`${key} must be a non-empty array.`);
			}
			for (const condition of conditions) {
				this.extractDatasetIdsFromWhere(condition, datasetIds);
			}
		} else if (key === "NOT") {
			this.extractDatasetIdsFromWhere(where[key], datasetIds);
		} else if (["LT", "GT", "EQ", "IS"].includes(key)) {
			const comparator = where[key];
			const compKey = Object.keys(comparator)[0];
			const [id] = compKey.split("_");
			datasetIds.add(id);
		} else {
			throw new InsightError("Invalid WHERE clause.");
		}
	}

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

	private mapResult(item: Section, columns: string[], datasetId: string): InsightResult {
		const result: any = {};
		for (const key of columns) {
			const [id, fieldStr] = key.split("_");
			if (id !== datasetId) {
				throw new InsightError("COLUMNS keys must reference the same dataset.");
			}

			const validFields: (keyof Section)[] = [
				"uuid",
				"id",
				"title",
				"instructor",
				"dept",
				"year",
				"avg",
				"pass",
				"fail",
				"audit",
			];

			if (!validFields.includes(fieldStr as keyof Section)) {
				throw new InsightError("Invalid field in COLUMNS.");
			}

			const field = fieldStr as keyof Section;
			result[key] = item[field];
		}
		return result;
	}

	private applyOrder(results: InsightResult[], options: any, columns: string[]): void {
		if ("ORDER" in options) {
			const order = options.ORDER;
			if (typeof order === "string") {
				if (!columns.includes(order)) {
					throw new InsightError("ORDER key must be in COLUMNS.");
				}
				results.sort((a, b) => {
					if (a[order] < b[order]) {
						return -1;
					} else if (a[order] > b[order]) {
						return 1;
					} else {
						// Secondary sort by 'sections_dept' alphabetically
						const secondaryKey = "sections_dept";
						if (a[secondaryKey] < b[secondaryKey]) {
							return -1;
						} else if (a[secondaryKey] > b[secondaryKey]) {
							return 1;
						} else {
							return 0;
						}
					}
				});
			} else if (typeof order === "object") {
				// Handle complex ordering if required
				throw new InsightError("Complex ORDER not implemented.");
			} else {
				throw new InsightError("Invalid ORDER.");
			}
		}
	}

	public applyOptions(data: Section[], options: any, datasetId: string): InsightResult[] {
		const columns = options.COLUMNS;
		const results = data.map((item) => this.mapResult(item, columns, datasetId));

		this.applyOrder(results, options, columns);

		return results;
	}
}
