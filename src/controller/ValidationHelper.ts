// ValidationHelper.ts

import { Section } from "./Section";
import { Room } from "./Room";
import { InsightError } from "./IInsightFacade";
import { DataType, validSectionFields, validRoomFields } from "./TypesConstants";

export class ValidationHelper {
	public static validateField(fieldStr: string, item: DataType): void {
		if (item instanceof Section) {
			if (!validSectionFields.includes(fieldStr as keyof Section)) {
				throw new InsightError("Invalid field in COLUMNS for Section.");
			}
		} else if (item instanceof Room) {
			if (!validRoomFields.includes(fieldStr as keyof Room)) {
				throw new InsightError("Invalid field in COLUMNS for Room.");
			}
		} else {
			throw new InsightError("Unknown data type.");
		}
	}

	public static isValidField(field: string, isSection: boolean): boolean {
		return isSection
			? validSectionFields.includes(field as keyof Section)
			: validRoomFields.includes(field as keyof Room);
	}

	public static validateNumericField(fieldStr: string, validNumericFields: string[], applyToken: string): void {
		if (!validNumericFields.includes(fieldStr)) {
			throw new InsightError(`${applyToken} can only be applied to numeric fields`);
		}
	}
}
