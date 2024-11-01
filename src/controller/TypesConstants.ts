// TypesConstants.ts

import { Section } from "./Section";
import { Room } from "./Room";

export type DataType = Section | Room;

export type NumericSectionField = "avg" | "pass" | "fail" | "audit" | "year";
export type StringSectionField = "dept" | "id" | "instructor" | "title" | "uuid";

export type NumericRoomField = "lat" | "lon" | "seats";
export type StringRoomField = "fullname" | "shortname" | "number" | "name" | "address" | "type" | "furniture" | "href";

export const validSectionFields: (keyof Section)[] = [
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

export const validRoomFields: (keyof Room)[] = [
	"fullname",
	"shortname",
	"number",
	"name",
	"address",
	"lat",
	"lon",
	"seats",
	"type",
	"furniture",
	"href",
];
