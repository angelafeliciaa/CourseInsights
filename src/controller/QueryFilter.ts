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
		this.validateSComparatorInput(data, sComparator); // Removed datasetId from arguments

		const [id, fieldStr] = Object.keys(sComparator)[0].split("_");
		const value = sComparator[`${id}_${fieldStr}`];

		const validFields = this.getValidStringFields(datasetId);
		this.validateFieldStr(fieldStr, validFields, datasetId);

		this.validatePattern(value);

		return data.filter((item) => this.matches((item as any)[fieldStr], value));
	}

	private validateSComparatorInput(data: DataType[], sComparator: any): void {
		// Removed datasetId from parameters
		if (data.length === 0) {
			throw new InsightError("Data array is empty. Cannot apply SComparator.");
		}

		if (typeof sComparator !== "object" || Array.isArray(sComparator) || sComparator === null) {
			throw new InsightError("SComparator must be a non-null object.");
		}

		const keys = Object.keys(sComparator);
		if (keys.length !== 1) {
			throw new InsightError("SComparator must have exactly one key.");
		}
	}

	private getValidStringFields(datasetId: string): readonly string[] {
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

		if (datasetId.startsWith("sections")) {
			return validSectionFields;
		} else if (datasetId.startsWith("rooms")) {
			return validRoomFields;
		} else {
			throw new InsightError("Unknown dataset ID prefix.");
		}
	}

	private validateFieldStr(fieldStr: string, validFields: readonly string[], datasetId: string): void {
		if (!validFields.includes(fieldStr)) {
			throw new InsightError(`Invalid field "${fieldStr}" in SComparator for dataset "${datasetId}".`);
		}
	}

	private validatePattern(value: string): void {
		if (typeof value !== "string") {
			throw new InsightError("SComparator value must be a string.");
		}

		if (this.isInvalidPattern(value)) {
			throw new InsightError("Invalid wildcard usage in IS.");
		}
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
