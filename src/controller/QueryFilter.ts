// FilterHelper.ts
import { InsightError } from "./IInsightFacade";
import { Section } from "./Section";
import { Room } from "./Room";

export type DataType = Section | Room;

export type NumericSectionField = "avg" | "pass" | "fail" | "audit" | "year";
export type StringSectionField = "dept" | "id" | "instructor" | "title" | "uuid";

export type NumericRoomField = "lat" | "lon" | "seats";
export type StringRoomField = "fullname" | "shortname" | "number" | "name" | "address" | "type" | "furniture" | "href";

export class FilterHelper {
	public applyWhereClause(data: DataType[], where: any, datasetId: string): DataType[] {
		if (Object.keys(where).length === 0) {
			return data;
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

	private applyAnd(data: DataType[], conditions: any[], datasetId: string): DataType[] {
		if (!Array.isArray(conditions) || conditions.length === 0) {
			throw new InsightError("AND conditions must be a non-empty array.");
		}
		return conditions.reduce((result, condition) => this.applyWhereClause(result, condition, datasetId), data);
	}

	private applyOr(data: DataType[], conditions: any[], datasetId: string): DataType[] {
		if (!Array.isArray(conditions) || conditions.length === 0) {
			throw new InsightError("OR conditions must be a non-empty array.");
		}
		const resultSet = new Set<DataType>();
		for (const condition of conditions) {
			const result = this.applyWhereClause(data, condition, datasetId);
			result.forEach((item) => resultSet.add(item));
		}
		return Array.from(resultSet);
	}

	private applyNot(data: DataType[], condition: any, datasetId: string): DataType[] {
		const matching = this.applyWhereClause(data, condition, datasetId);
		return data.filter((item) => !matching.includes(item));
	}

	private applyMComparator(data: DataType[], comparator: string, mComparator: any, datasetId: string): DataType[] {
		const mKey = Object.keys(mComparator)[0];
		const value = mComparator[mKey];
		if (typeof value !== "number") {
			throw new InsightError("MComparator value must be a number.");
		}

		const [id, fieldStr] = mKey.split("_");
		if (id !== datasetId) {
			throw new InsightError("MComparator key must reference the correct dataset.");
		}

		// const validSectionFields: readonly NumericSectionField[] = ["avg", "pass", "fail", "audit", "year"];
		// const validRoomFields: readonly NumericRoomField[] = ["lat", "lon", "seats"];

		// const isSection = data[0] instanceof Section;
		// const validFields = isSection ? validSectionFields : validRoomFields;

		// const field = fieldStr as NumericSectionField | NumericRoomField;

		// if (!validFields.includes(fieldStr as any)) {
		// 	throw new InsightError(`Invalid field in MComparator for ${isSection ? "Section" : "Room"}.`);
		// }

		return data.filter((item) => {
			const itemValue = (item as any)[fieldStr];
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

	private applySComparator(data: DataType[], sComparator: any, datasetId: string): DataType[] {
		// Ensure that the data array is not empty to prevent runtime errors
		if (data.length === 0) {
			throw new InsightError("Data array is empty. Cannot apply SComparator.");
		}
	
		const sKey = Object.keys(sComparator)[0];
		const value = sComparator[sKey];
	
		// Validate that the comparator value is a string
		if (typeof value !== "string") {
			throw new InsightError("SComparator value must be a string.");
		}
	
		// Split the key into dataset ID and field string
		const [id, fieldStr] = sKey.split("_");
	
		// Validate that the dataset ID matches the expected dataset
		if (id !== datasetId) {
			throw new InsightError("SComparator key must reference the correct dataset.");
		}
	
		// Define valid fields for different dataset types
		// Adjust these arrays based on your actual dataset schema
		const validSectionFields: readonly string[] = ["dept", "id", "instructor", "title", "uuid"];
		const validRoomFields: readonly string[] = [
			"fullname",
			"shortname",
			"number",
			"name",
			"address",
			"type",
			"furniture",
			"href",
		];
	
		// Determine the dataset type based on the dataset ID prefix
		let validFields: readonly string[];
		if (datasetId.startsWith("sections")) {
			validFields = validSectionFields;
		} else if (datasetId.startsWith("rooms")) {
			validFields = validRoomFields;
		} else {
			throw new InsightError("Unknown dataset ID prefix.");
		}
	
		// Validate that the fieldStr is among the valid fields for the dataset
		if (!validFields.includes(fieldStr)) {
			throw new InsightError(`Invalid field "${fieldStr}" in SComparator for dataset "${datasetId}".`);
		}
	
		// Check for invalid wildcard patterns in the comparator value
		if (this.isInvalidPattern(value)) {
			throw new InsightError("Invalid wildcard usage in IS.");
		}
	
		// Perform the filtering based on the comparator
		return data.filter((item) => this.matches((item as any)[fieldStr], value));
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
