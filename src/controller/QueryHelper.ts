// QueryHelper.ts from llm

import { InsightError, InsightResult } from "./IInsightFacade";
import { Section } from "./Section";
import { FilterHelper } from "./QueryFilter";
import { DataType } from "./TypesConstants";
import { AggregationHelper } from "./AggregationHelper";
import { ValidationHelper } from "./ValidationHelper";
import { ExtractDatasetHelper } from "./ExtractDatasetHelper";

export class QueryHelper {
	private existingDatasetIds: string[];
	private datasets: Map<string, DataType[]>;
	private filterHelper: FilterHelper;

	constructor(existingDatasetIds: string[], datasets: Map<string, DataType[]>) {
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

		// Additional validations can be added here if necessary

		return true;
	}

	public getDatasetIdFromQuery(query: any): string {
		const datasetIds = new Set<string>();
		const columns = query.OPTIONS.COLUMNS;

		ExtractDatasetHelper.extractDatasetIdsFromColumns(columns, query, datasetIds);
		ExtractDatasetHelper.extractDatasetIdsFromWhere(query.WHERE, datasetIds);

		if ("TRANSFORMATIONS" in query) {
			ExtractDatasetHelper.extractDatasetIdsFromTransformations(query.TRANSFORMATIONS, datasetIds);
		}

		// Ensure only one dataset ID is used
		if (datasetIds.size !== 1) {
			throw new InsightError("Query references multiple datasets.");
		}

		return datasetIds.values().next().value;
	}

	public applyWhereClause(data: DataType[], where: any, datasetId: string): DataType[] {
		return this.filterHelper.applyWhereClause(data, where, datasetId);
	}

	private mapResult(item: DataType, columns: string[], datasetId: string): InsightResult {
		const result: any = {};
		for (const key of columns) {
			const [id, fieldStr] = key.split("_");

			if (id !== datasetId) {
				throw new InsightError("COLUMNS keys must reference the same dataset.");
			}

			// Validate the field
			ValidationHelper.validateField(fieldStr, item);

			// Assign the value to the result
			result[key] = (item as any)[fieldStr];
		}
		return result;
	}

	private applyOrder(results: InsightResult[], options: any, columns: string[]): void {
		if ("ORDER" in options) {
			const order = options.ORDER;

			if (typeof order === "string") {
				this.applySimpleOrder(results, order, columns);
			} else if (typeof order === "object" && order !== null) {
				this.applyComplexOrder(results, order, columns);
			} else {
				throw new InsightError("Invalid ORDER.");
			}
		}
	}

	private applySimpleOrder(results: InsightResult[], orderKey: string, columns: string[]): void {
		if (!columns.includes(orderKey)) {
			throw new InsightError("ORDER key must be in COLUMNS.");
		}
		results.sort((a, b) => {
			if (a[orderKey] < b[orderKey]) {
				return -1;
			} else if (a[orderKey] > b[orderKey]) {
				return 1;
			} else {
				return 0;
			}
		});
	}

	private applyComplexOrder(results: InsightResult[], order: any, columns: string[]): void {
		const { dir, keys } = order;

		// Validate 'dir' and 'keys'
		this.validateOrderObject(dir, keys, columns);

		const direction = dir === "UP" ? 1 : -1;

		results.sort((a, b) => {
			for (const key of keys) {
				if (a[key] < b[key]) {
					return -1 * direction;
				} else if (a[key] > b[key]) {
					return 1 * direction;
				}
				// If equal, continue to next key
			}
			return 0; // All keys are equal
		});
	}

	private validateOrderObject(dir: string, keys: string[], columns: string[]): void {
		if (!dir || !keys || !Array.isArray(keys) || keys.length === 0) {
			throw new InsightError("Invalid ORDER object.");
		}
		if (dir !== "UP" && dir !== "DOWN") {
			throw new InsightError("Invalid ORDER direction. Must be 'UP' or 'DOWN'.");
		}

		// Check that all ORDER keys are included in COLUMNS
		for (const key of keys) {
			if (!columns.includes(key)) {
				throw new InsightError("ORDER keys must be in COLUMNS.");
			}
		}
	}

	public applyOptions(data: DataType[], options: any, datasetId: string): InsightResult[] {
		const columns = options.COLUMNS;
		const results = data.map((item) => this.mapResult(item, columns, datasetId));
		this.applyOrder(results, options, columns);
		return results;
	}

	public applyTransformations(data: DataType[], transformations: any, datasetId: string): DataType[] {
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
		const groupedData = this.groupData(data, GROUP);
		// console.log(groupedData);

		// Apply the transformations to each group
		const transformedData = this.applyAggregations(groupedData, APPLY, datasetId, GROUP);
		// console.log(transformedData);

		return transformedData;
	}

	private groupData(data: DataType[], groupKeys: string[]): Map<string, DataType[]> {
		const groupMap = new Map<string, DataType[]>();

		for (const item of data) {
			// Construct a key using the full group keys
			const key = groupKeys
				.map((groupKey) => {
					const [, fieldStr] = groupKey.split("_");

					// Validate that the field exists in the item
					if (!(fieldStr in item)) {
						throw new InsightError(`Invalid group key: ${groupKey}`);
					}

					return (item as any)[fieldStr];
				})
				.join("|");

			if (!groupMap.has(key)) {
				groupMap.set(key, []);
			}
			groupMap.get(key)!.push(item);
		}

		return groupMap;
	}

	// private initializeGroupResult(key: string, groupKeys: string[]): any {
	// 	const result: any = {};
	// 	const keyValues = key.split("|");

	// 	for (let i = 0; i < groupKeys.length; i++) {
	// 		const groupKey = groupKeys[i];
	// 		result[groupKey] = keyValues[i];
	// 	}

	// 	return result;
	// }

	private initializeGroupResult(key: string, groupKeys: string[]): any {
		const result: any = {};
		const keyValues = key.split("|");

		for (let i = 0; i < groupKeys.length; i++) {
			const groupKey = groupKeys[i];
			const [, fieldStr] = groupKey.split("_");
			const value = keyValues[i];

			// Preserve the original type based on the field
			if (this.isNumericField(fieldStr)) {
				result[groupKey] = Number(value);
			} else {
				result[groupKey] = value; // Keep as string
			}
		}

		return result;
	}

	// Helper method to determine if a field should be numeric
	private isNumericField(fieldStr: string): boolean {
		const numericFields = new Set([
			"avg",
			"pass",
			"fail",
			"audit",
			"year", // Section numeric fields
			"lat",
			"lon",
			"seats", // Room numeric fields
		]);
		return numericFields.has(fieldStr);
	}

	private applyAggregations(
		groupedData: Map<string, DataType[]>,
		applyRules: any[],
		datasetId: string,
		groupKeys: string[]
	): any[] {
		const results: any[] = [];

		for (const [key, group] of groupedData) {
			const result = this.initializeGroupResult(key, groupKeys);
			this.processApplyRules(group, applyRules, datasetId, result);
			results.push(result);
		}

		return results;
	}

	private processApplyRules(group: DataType[], applyRules: any[], datasetId: string, result: any): void {
		const isSection = group[0] instanceof Section;
		const validNumericFields = isSection ? ["avg", "pass", "fail", "audit", "year"] : ["lat", "lon", "seats"];

		for (const applyRule of applyRules) {
			this.processApplyRule(group, applyRule, datasetId, result, isSection, validNumericFields);
		}
	}

	private processApplyRule(
		group: DataType[],
		applyRule: any,
		datasetId: string,
		result: any,
		isSection: boolean,
		validNumericFields: string[]
	): void {
		const applyKey = Object.keys(applyRule)[0];
		const applyTokenObj = applyRule[applyKey];
		const applyToken = Object.keys(applyTokenObj)[0];
		const applyField = applyTokenObj[applyToken];

		const [id, fieldStr] = applyField.split("_");
		if (id !== datasetId) {
			throw new InsightError("APPLY keys must reference the same dataset.");
		}

		// Check if the field is valid for the data type
		if (!ValidationHelper.isValidField(fieldStr, isSection)) {
			throw new InsightError(`Invalid field ${fieldStr} for ${isSection ? "Section" : "Room"}`);
		}

		this.performAggregation(group, applyToken, fieldStr, applyKey, result, validNumericFields);
	}

	private performAggregation(
		group: DataType[],
		applyToken: string,
		fieldStr: string,
		applyKey: string,
		result: any,
		validNumericFields: string[]
	): void {
		// Extract values from the group based on the fieldStr
		const values = group.map((item) => (item as any)[fieldStr]);

		switch (applyToken) {
			case "AVG":
				ValidationHelper.validateNumericField(fieldStr, validNumericFields, applyToken);
				result[applyKey] = AggregationHelper.calculateAvg(values);
				break;
			case "SUM":
				ValidationHelper.validateNumericField(fieldStr, validNumericFields, applyToken);
				result[applyKey] = AggregationHelper.calculateSum(values);
				break;
			case "MIN":
				ValidationHelper.validateNumericField(fieldStr, validNumericFields, applyToken);
				result[applyKey] = AggregationHelper.calculateMin(values);
				break;
			case "MAX":
				ValidationHelper.validateNumericField(fieldStr, validNumericFields, applyToken);
				result[applyKey] = AggregationHelper.calculateMax(values);
				break;
			case "COUNT":
				// For COUNT, values can be any type (number or string)
				result[applyKey] = AggregationHelper.calculateCount(values);
				break;
			default:
				throw new InsightError("Unsupported APPLY token.");
		}
	}

	public applyOptionsWithTransformations(
		data: DataType[],
		options: any,
		transformations: any,
		datasetId: string
	): InsightResult[] {
		const transformedData = this.applyTransformations(data, transformations, datasetId);

		// console.log(transformedData);

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
