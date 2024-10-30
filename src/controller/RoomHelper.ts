import { Room } from "./Room";
import JSZip from "jszip";
import { InsightError } from "./IInsightFacade";
const parse5 = require("parse5");

async function unpackRoomZip(content: string, path: string): Promise<[string, any][]> {
	try {
		const zip = new JSZip();
		const zipContent = await zip.loadAsync(content, { base64: true });
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

function searchForTables(node: any, type: string): any {
	if (node.tagName === "table") {
		if (isTargetTable(node)) {
			return node;
		}
	}

	if (node.childNodes && node.childNodes.length > 0) {
		for (const childNode of node.childNodes) {
			const resultNode = searchForTables(childNode, type);
			if (resultNode !== null) {
				return resultNode;
			}
		}
	}
	return null;
}

function processBuildingTable(table: any): any[] {
	return table.childNodes.flatMap((childNode: any) =>
		childNode.nodeName === "tbody"
			? childNode.childNodes
					.filter((element: any) => element.nodeName === "tr")
					.map((element: any) => ({
						shortname: nodeSearch("views-field-field-building-code", element)
							.trim()
							.replace(/\s+/g, "")
							.replace(/\W+/g, ""),
						address: nodeSearch("views-field-field-building-address", element).trim(),
					}))
			: []
	);
}

function processRoomTable(validTable: any, building: { shortname: string; address: string }, fullname: string): Room[] {
	try {
		return validTable.childNodes.flatMap((node: any) =>
			node.nodeName === "tbody"
				? node.childNodes
						.filter((child: any) => child.nodeName === "tr")
						.map((child: any) => {
							const room = new Room(); // Assuming Room constructor can handle partial initialization
							room.fullname = fullname;
							room.shortname = building.shortname;
							room.address = building.address as string;
							// const geo = geolocations.get(building.shortname) as GeoResponse;
							// room.lat = geo.lat as number;
							// room.lon = geo.lon as number;
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

function isTargetTable(node: any): boolean {
	if (!node.childNodes) {
		return false;
	} else {
		return true;
	}
}

export function nodeSearch(viewsFieldViewsFieldTitle: string, node: any): any {
	const queue: any[] = [node];
	while (queue.length > 0) {
		const currentNode: any = queue.pop(); // Remove and get the first element of the queue
		if (currentNode.attrs && currentNode.attrs.length > 0) {
			const value = currentNode.attrs[0].value;

			if (viewsFieldViewsFieldTitle === "href") {
				return currentNode.childNodes[1].childNodes[1].attrs[0].value;
			}

			if (value === viewsFieldViewsFieldTitle) {
				// room number special case hard code for now
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
			// Add all children to the queue
			for (const child of currentNode.childNodes) {
				queue.push(child);
			}
		}
	}
	throw new InsightError("NodeSearch: Node name doesnt exist" + viewsFieldViewsFieldTitle);
}

export async function parseRooms(content: any): Promise<Room[]> {
	try {
		const zip = await JSZip.loadAsync(content, { base64: true });
		const filePromise = await zip.files["index.htm"].async("string");
		const document = parse5.parse(filePromise);

		const table = searchForTables(document, "building");
		const listOfBuildings = processBuildingTable(table);

		const rooms = await unpackRoomZip(content, "campus/discover/buildings-and-classrooms/");
		const roomsData = rooms.flatMap((roomDocument) => {
			const building = listOfBuildings.find((b: { shortname: string }) => b.shortname === roomDocument[0]);
			if (!building || !roomDocument[1]) {
				return [];
			}

			const html = parse5.parse(document[1] as string);
			const validTable = searchForTables(html, "room");
			if (!validTable) {
				return [];
			}
			const fullname = nodeSearch("building-info", html).trim();
			return processRoomTable(validTable, building, fullname);
		});
		return roomsData;
	} catch (e) {
		return Promise.reject(new InsightError(`${e}`));
	}
}
