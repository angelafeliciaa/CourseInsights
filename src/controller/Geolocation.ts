import * as http from "http";

export interface GeoResponse {
	lat?: number;
	lon?: number;
	error?: string;
}

async function getGeoLocation(address: string): Promise<GeoResponse> {
	const encodedAddress = encodeURIComponent(address);
	const url = "http://cs310.students.cs.ubc.ca:11316/api/v1/project_team058/" + encodedAddress;
	return new Promise((resolve, reject) => {
		http
			.get(url, (res) => {
				let data = "";
				res.on("data", (chunk) => {
					data += chunk;
				});

				res.on("end", () => {
					try {
						const parsedData: GeoResponse = JSON.parse(data);
						resolve(parsedData);
					} catch (_error) {
						reject({ error: "Failed to parse response" });
					}
				});
			})
			.on("error", (_error) => {
				reject({ error: "Failed to fetch geolocation" });
			});
	});
}

export async function getGeoLocations(
	buildings: { shortname: string; address: string }[]
): Promise<Map<string, GeoResponse>> {
	const allGeo = await Promise.all(buildings.map(async (b) => getGeoLocation(b.address)));
	const allGeoBuildings = new Map<string, GeoResponse>();
	buildings.forEach((building, i) => {
		allGeoBuildings.set(building.shortname, allGeo[i]);
	});
	return allGeoBuildings;
}
