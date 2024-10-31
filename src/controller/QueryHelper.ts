// QueryHelper.ts got from llm
import Decimal from "decimal.js";
import { InsightError, InsightResult } from "./IInsightFacade";
import { Section } from "./Section";
import { FilterHelper } from "./QueryFilter";

type NumericSectionField = "avg" | "pass" | "fail" | "audit" | "year";
// type StringSectionField = "dept" | "id" | "instructor" | "title" | "uuid";

export class QueryHelper {
	private existingDatasetIds: string[];
	private datasets: Map<string, Section[]>;
	private filterHelper: FilterHelper;

	constructor(existingDatasetIds: string[], datasets: Map<string, Section[]>) {
		this.existingDatasetIds = existingDatasetIds;
		this.datasets = datasets;
		this.filterHelper = new FilterHelper();
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
		return true;
	}

	public getDatasetIdFromQuery(query: any): string {
		const datasetIds = new Set<string>();
		const columns = query.OPTIONS.COLUMNS;

		for (const key of columns) {
			if (typeof key !== "string") {
				throw new InsightError("COLUMNS contains invalid key.");
			}
			const [id] = key.split("_");
			datasetIds.add(id);
		}

		this.extractDatasetIdsFromWhere(query.WHERE, datasetIds);

		if ("TRANSFORMATIONS" in query) {
			this.extractDatasetIdsFromTransformations(query.TRANSFORMATIONS, datasetIds);
		}

		if (datasetIds.size !== 1) {
			throw new InsightError("Query references multiple datasets.");
		}

		return datasetIds.values().next().value;
	}

	private extractDatasetIdsFromTransformations(transformations: any, datasetIds: Set<string>): void {
		const { GROUP, APPLY } = transformations;

		// Extract from GROUP
		for (const groupKey of GROUP) {
			const [id] = groupKey.split("_");
			datasetIds.add(id);
		}

		// Extract from APPLY
		for (const applyRule of APPLY) {
			const applyKey = Object.keys(applyRule)[0];
			const applyTokenObj = applyRule[applyKey];

			// Ensure applyTokenObj is of the correct type
			if (typeof applyTokenObj !== "object" || applyTokenObj === null) {
				throw new InsightError("Invalid APPLY token object.");
			}

			const applyToken = Object.keys(applyTokenObj)[0];
			const applyField = applyTokenObj[applyToken];

			const [id] = applyField.split("_");
			datasetIds.add(id);
		}
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
		return this.filterHelper.applyWhereClause(data, where, datasetId);
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
				const orderKey = order;
				results.sort((a, b) => {
					if (a[orderKey] < b[orderKey]) {
						return -1;
					} else if (a[orderKey] > b[orderKey]) {
						return 1;
					} else {
						return 0;
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

	public applyTransformations(data: Section[], transformations: any, datasetId: string): Section[] {
		if (!transformations || Object.keys(transformations).length === 0) {
			return data;
		}

		const { GROUP, APPLY } = transformations;

		if (!Array.isArray(GROUP) || GROUP.length === 0) {
			throw new InsightError("GROUP must be a non-empty array.");
		}

		if (!Array.isArray(APPLY)) {
			throw new InsightError("APPLY must be an array.");
		}

		// Group the data based on GROUP keys
		const groupedData = this.groupData(data, GROUP, datasetId);

		// Apply the transformations to each group
		const transformedData = this.applyAggregations(groupedData, APPLY, datasetId);

		return transformedData;
	}

	private groupData(data: Section[], groupKeys: string[], datasetId: string): Map<string, Section[]> {
		const groupMap = new Map<string, Section[]>();

		for (const item of data) {
			let key = "";
			for (const groupKey of groupKeys) {
				const [id, fieldStr] = groupKey.split("_");
				if (id !== datasetId) {
					throw new InsightError("GROUP keys must reference the same dataset.");
				}
				key += item[fieldStr as keyof Section] + "|";
			}
			if (!groupMap.has(key)) {
				groupMap.set(key, []);
			}
			groupMap.get(key)!.push(item);
		}

		return groupMap;
	}

	private initializeGroupResult(key: string, groupedDataKeys: string[], datasetId: string): any {
		const result: any = {};
		const keyValues = key.split("|").slice(0, -1);
		for (let i = 0; i < keyValues.length; i++) {
			const groupKey = groupedDataKeys[0].split("|")[i];
			const [id] = groupKey.split("_");
			if (id !== datasetId) {
				throw new InsightError("GROUP keys must reference the same dataset.");
			}
			result[groupKey] = keyValues[i];
		}
		return result;
	}

	private applyAggregations(groupedData: Map<string, Section[]>, applyRules: any[], datasetId: string): any[] {
		const results: any[] = [];
		const groupedDataKeys = Array.from(groupedData.keys());

		for (const [key, group] of groupedData) {
			// Initialize result with group keys
			const result = this.initializeGroupResult(key, groupedDataKeys, datasetId);

			// Apply each aggregation rule
			this.processApplyRules(group, applyRules, datasetId, result);

			results.push(result);
		}

		return results;
	}

	private processApplyRules(group: Section[], applyRules: any[], datasetId: string, result: any): void {
		for (const applyRule of applyRules) {
			const applyKey = Object.keys(applyRule)[0];
			const applyTokenObj = applyRule[applyKey];
			const applyToken = Object.keys(applyTokenObj)[0];
			const applyField = applyTokenObj[applyToken];

			const [id, fieldStr] = applyField.split("_");
			if (id !== datasetId) {
				throw new InsightError("APPLY keys must reference the same dataset.");
			}

			switch (applyToken) {
				case "AVG":
					result[applyKey] = this.calculateAvg(group, fieldStr as NumericSectionField);
					break;
				case "SUM":
					result[applyKey] = this.calculateSum(group, fieldStr as NumericSectionField);
					break;
				case "MIN":
					result[applyKey] = this.calculateMin(group, fieldStr as NumericSectionField);
					break;
				case "MAX":
					result[applyKey] = this.calculateMax(group, fieldStr as NumericSectionField);
					break;
				case "COUNT":
					result[applyKey] = this.calculateCount(group, fieldStr as keyof Section);
					break;
				default:
					throw new InsightError("Unsupported APPLY token.");
			}
		}
	}

	private calculateAvg(group: Section[], field: NumericSectionField): number {
		let total = new Decimal(0);
		for (const item of group) {
			const decimalValue = new Decimal(item[field]);
			total = total.add(decimalValue);
		}
		const avg = total.toNumber() / group.length;
		const decimalPlace = 2;
		const res = Number(new Decimal(avg).toFixed(decimalPlace));
		return res;
	}

	private calculateSum(group: Section[], field: NumericSectionField): number {
		let total = new Decimal(0);
		for (const item of group) {
			const decimalValue = new Decimal(item[field]);
			total = total.add(decimalValue);
		}
		const decimalPlace = 2;
		const res = Number(total.toFixed(decimalPlace));
		return res;
	}

	private calculateMin(group: Section[], field: NumericSectionField): number {
		return Math.min(...group.map((item) => item[field]));
	}

	private calculateMax(group: Section[], field: NumericSectionField): number {
		return Math.max(...group.map((item) => item[field]));
	}

	private calculateCount(group: Section[], field: keyof Section): number {
		return new Set(group.map((item) => item[field])).size;
	}

	public applyOptionsWithTransformations(
		data: Section[],
		options: any,
		transformations: any,
		datasetId: string
	): InsightResult[] {
		// First, apply transformations
		const transformedData = this.applyTransformations(data, transformations, datasetId);

		const columns = options.COLUMNS;
		const results = transformedData.map((item: any) => {
			const result: any = {};
			for (const key of columns) {
				if (key.includes("_")) {
					// Deal with group keys
					const [id] = key.split("_");
					if (id !== datasetId) {
						throw new InsightError("COLUMNS keys must reference the same dataset.");
					}
					result[key] = item[key];
				} else {
					// Deal with apply keys
					result[key] = item[key];
				}
			}
			return result;
		});

		this.applyOrder(results, options, columns);

		return results;
	}
}
