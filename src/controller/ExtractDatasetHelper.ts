// ExtractDatasetHelper.ts
import { InsightError } from "./IInsightFacade";

export class ExtractDatasetHelper {
	public static extractDatasetIdsFromColumns(columns: string[], query: any, datasetIds: Set<string>): void {
		for (const key of columns) {
			if (typeof key !== "string") {
				throw new InsightError("COLUMNS contains invalid key.");
			}

			if (key.includes("_")) {
				// Regular key in the format 'id_field'
				const [id] = key.split("_");
				datasetIds.add(id);
			} else {
				// Apply key
				if ("TRANSFORMATIONS" in query) {
					const applyRules = query.TRANSFORMATIONS.APPLY;

					// Validate that APPLY is an array
					if (!Array.isArray(applyRules)) {
						throw new InsightError("APPLY must be an array.");
					}

					const applyRule = applyRules.find((rule: any) => Object.keys(rule)[0] === key);
					if (applyRule) {
						const applyTokenObj = applyRule[key];
						const applyToken = Object.keys(applyTokenObj)[0];
						const applyField = applyTokenObj[applyToken];
						const [id] = applyField.split("_");
						datasetIds.add(id);
					} else {
						throw new InsightError(`Apply key ${key} not found in APPLY definitions.`);
					}
				} else {
					throw new InsightError(`Apply key ${key} found in COLUMNS but no TRANSFORMATIONS provided.`);
				}
			}
		}
	}

	public static extractDatasetIdsFromTransformations(transformations: any, datasetIds: Set<string>): void {
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

	public static extractDatasetIdsFromWhere(where: any, datasetIds: Set<string>): void {
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
}
