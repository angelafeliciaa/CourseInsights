// SortingHelper.ts
import { InsightError, InsightResult } from "../IInsightFacade";

export class SortingHelper {
	public static applyComplexOrder(results: InsightResult[], order: any, columns: string[]): void {
		if (typeof order === "string") {
			this.applySimpleOrder(results, order, columns);
			return;
		}

		if (!order.dir || !order.keys || !Array.isArray(order.keys) || order.keys.length === 0) {
			throw new InsightError("Invalid ORDER specification");
		}

		const { dir, keys } = order;
		if (dir !== "UP" && dir !== "DOWN") {
			throw new InsightError("ORDER direction must be either UP or DOWN");
		}

		// Validate that all keys are in columns
		for (const key of keys) {
			if (!columns.includes(key)) {
				throw new InsightError(`ORDER key ${key} must be in COLUMNS`);
			}
		}

		results.sort((a, b) => {
			for (const key of keys) {
				if (a[key] < b[key]) return dir === "UP" ? -1 : 1;
				if (a[key] > b[key]) return dir === "UP" ? 1 : -1;
			}
			return 0;
		});
	}

	private static applySimpleOrder(results: InsightResult[], orderKey: string, columns: string[]): void {
		if (!columns.includes(orderKey)) {
			throw new InsightError("ORDER key must be in COLUMNS.");
		}

		results.sort((a, b) => {
			if (a[orderKey] < b[orderKey]) return -1;
			if (a[orderKey] > b[orderKey]) return 1;
			return 0;
		});
	}
}
