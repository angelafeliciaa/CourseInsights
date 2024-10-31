import { Room } from "./Room";
import JSZip from "jszip";
import { InsightError } from "./IInsightFacade";
import { GeoResponse, getGeoLocations } from "./Geolocation";
const parse5 = require("parse5");

async function unpackRoomZip(content: string, path: string): Promise<[string, any][]> {
	try {
		const zipContent = await isValidZip(content);
		if (zipContent.files[path]) {
			const listOfPromises: Promise<string>[] = [];
			const listOfRooms: [string, string][] = [];
			const listofNames: string[] = [];
			Object.keys(zipContent.files).forEach((file) => {
				if (zipContent.files[file] && !zipContent.files[file].dir) {
					const fileName = file.substring(file.lastIndexOf("/") + 1).split(".")[0];
					const filePromise = zipContent.files[file].async("string");
					listofNames.push(fileName);
					listOfPromises.push(filePromise);
				}
			});
			const listOfPromisesDone = await Promise.all(listOfPromises);
			listOfPromisesDone.forEach((listContent, i) => {
				listOfRooms.push([listofNames[i], listContent]);
			});
			return listOfRooms;
		} else {
			return Promise.reject("Path doesn't exist");
		}
	} catch {
		throw new InsightError("Invalid zip file");
	}
}

async function isValidZip(base64Str: string): Promise<JSZip> {
	try {
		const zip = new JSZip();
		const zipContent = await zip.loadAsync(base64Str, { base64: true });
		return zipContent;
	} catch {
		throw new InsightError("Invalid zip file");
	}
}

function searchForTables(node: any, type: string): any {
	try {
		// Check the current node itself.
		if (node.tagName === "table" && isTargetTable(node, type)) {
			return node;
		}
		// If the current node has child nodes, recurse through them.
		if (node.childNodes && node.childNodes.length > 0) {
			for (const childNode of node.childNodes) {
				const resultNode = searchForTables(childNode, type);
				if (resultNode !== null) {
					// Return as soon as a valid node is found.
					return resultNode;
				}
			}
		}
		return null;
	} catch (e) {
		throw new InsightError(`SearchForTables: ${e}`);
	}
}

function processBuildingTable(table: any): { fullname: string; shortname: string; address: string }[] {
	return table.childNodes.flatMap((childNode: any) =>
		childNode.nodeName === "tbody"
			? childNode.childNodes
					.filter((element: any) => element.nodeName === "tr")
					.map((element: any) => ({
						fullname: nodeSearch("views-field views-field-title", element).trim(),
						shortname: nodeSearch("views-field views-field-field-building-code", element)
							.trim()
							.replace(/\s+/g, "")
							.replace(/\W+/g, ""),
						address: nodeSearch("views-field views-field-field-building-address", element).trim(),
					}))
			: []
	);
}

function processRoomTable(
	validTable: any,
	building: { fullname: string; shortname: string; address: string },
	geolocations: Map<string, GeoResponse>
): Room[] {
	try {
		return validTable.childNodes.flatMap((node: any) =>
			node.nodeName === "tbody"
				? node.childNodes
						.filter((child: any) => child.nodeName === "tr")
						.map((child: any) => {
							const room = new Room();
							room.fullname = building.fullname;
							room.shortname = building.shortname;
							room.address = building.address as string;
							const geo = geolocations.get(building.shortname) as GeoResponse;
							room.lat = geo.lat as number;
							room.lon = geo.lon as number;
							getRoomInfo(child, room);
							return room;
						})
				: []
		);
	} catch (e) {
		throw new Error(`ProcessRoomNodes ${e}`);
	}
}

export function getRoomInfo(element: any, room: Room): any {
	room.number = nodeSearch("views-field views-field-field-room-number", element);
	room.href = nodeSearch("href", element);
	room.name = room.shortname + "_" + room.number;
	room.type = nodeSearch("views-field views-field-field-room-type", element).trim();
	room.furniture = nodeSearch("views-field views-field-field-room-furniture", element).trim();
	room.seats = parseInt(nodeSearch("views-field views-field-field-room-capacity", element).trim(), 10);
}

function isTargetTable(tableNode: any, type: string): boolean {
	const requiredClasses =
		type === "building"
			? ["views-field-title", "views-field-field-building-code", "views-field-field-building-address"]
			: ["views-field-field-room-number", "views-field-field-room-capacity", "views-field-field-room-type"];

	function hasRequiredClasses(node: any): boolean {
		if (node.nodeName === "td" && node.attrs) {
			const classAttr = node.attrs.find((attr: any) => attr.name === "class");
			if (classAttr) {
				return requiredClasses.some((cls) => classAttr.value.includes(cls));
			}
		}
		if (node.childNodes) {
			return node.childNodes.some((child: any) => hasRequiredClasses(child));
		}
		return false;
	}

	return hasRequiredClasses(tableNode);
}

export function nodeSearch(viewsFieldViewsFieldTitle: string, node: any): any {
	const queue: any[] = [node];
	while (queue.length > 0) {
		const currentNode: any = queue.pop();
		if (currentNode.attrs && currentNode.attrs.length > 0) {
			const value = currentNode.attrs[0].value;

			if (viewsFieldViewsFieldTitle === "href") {
				return currentNode.childNodes[1].childNodes[1].attrs[0].value;
			}

			if (value === viewsFieldViewsFieldTitle) {
				if (viewsFieldViewsFieldTitle === "views-field views-field-field-room-number") {
					return currentNode.childNodes[1].childNodes[0].value;
				}
				if (viewsFieldViewsFieldTitle === "building-info") {
					return currentNode.childNodes[1].childNodes[0].childNodes[0].value;
				}
				return currentNode.childNodes[0].value;
			}
		}

		if (currentNode.childNodes) {
			for (const child of currentNode.childNodes) {
				queue.push(child);
			}
		}
	}
	throw new InsightError("NodeSearch: Node name doesnt exist" + viewsFieldViewsFieldTitle);
}

export async function parseRooms(content: any): Promise<Room[]> {
	try {
		const zip = await isValidZip(content);
		const fileContent = await zip.files["index.htm"].async("string");
		const document = parse5.parse(fileContent);

		const table = searchForTables(document, "building");
		const listOfBuildings = processBuildingTable(table);
		const geolocations = await getGeoLocations(listOfBuildings);

		const rooms = await unpackRoomZip(content, "campus/discover/buildings-and-classrooms/");
		const roomsData = rooms.flatMap((roomDocument) => {
			const building = listOfBuildings.find((b: { shortname: string }) => b.shortname === roomDocument[0]);
			if (!building || !roomDocument[1]) {
				return [];
			}

			const html = parse5.parse(roomDocument[1] as string);
			const validTable = searchForTables(html, "room");
			if (!validTable) {
				return [];
			}
			return processRoomTable(validTable, building, geolocations);
		});
		return roomsData;
	} catch (e) {
		return Promise.reject(new InsightError(`${e}`));
	}
}
