// AggregationHelper.ts

import Decimal from "decimal.js";
import { DataType, NumericSectionField, NumericRoomField, StringSectionField, StringRoomField } from "./TypesConstants";

export class AggregationHelper {
	public static calculateAvg(group: DataType[], field: NumericSectionField | NumericRoomField): number {
		let total = new Decimal(0);
		for (const item of group) {
			const decimalValue = new Decimal((item as any)[field]);
			total = total.add(decimalValue);
		}
		const avg = total.toNumber() / group.length;
		const decimalPlace = 2;
		return Number(new Decimal(avg).toFixed(decimalPlace));
	}

	public static calculateSum(group: DataType[], field: NumericSectionField | NumericRoomField): number {
		let total = new Decimal(0);
		for (const item of group) {
			const decimalValue = new Decimal((item as any)[field]);
			total = total.add(decimalValue);
		}
		const decimalPlace = 2;
		return Number(total.toFixed(decimalPlace));
	}

	public static calculateMin(group: DataType[], field: NumericSectionField | NumericRoomField): number {
		return Math.min(...group.map((item) => (item as any)[field]));
	}

	public static calculateMax(group: DataType[], field: NumericSectionField | NumericRoomField): number {
		return Math.max(...group.map((item) => (item as any)[field]));
	}

	public static calculateCount(
		group: DataType[],
		field: NumericSectionField | NumericRoomField | StringSectionField | StringRoomField
	): number {
		return new Set(group.map((item) => (item as any)[field])).size;
	}
}
