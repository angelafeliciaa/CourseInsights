import { expect } from "chai";
import request from "supertest";
import { StatusCodes } from "http-status-codes";
import Log from "@ubccpsc310/folder-test/build/Log";
import Server from "../../src/rest/Server";
import fs from "fs-extra";
import path from "path";
// import { clearDisk } from "../TestUtil";

// from llm

describe("Facade C3", function () {
	let server: Server;
	const SERVER_URL = "http://localhost:4321";
	const SERVER_PORT = 4321;

	before(async function () {
		server = new Server(SERVER_PORT);
		try {
			await server.start();
			Log.info(`Server started on port ${SERVER_PORT}`);
		} catch (err) {
			Log.error(`Failed to start server: ${err}`);
			expect.fail("Failed to start server");
		}
	});

	after(async function () {
		try {
			await server.stop();
			Log.info("Server stopped");
		} catch (err) {
			Log.error(`Failed to stop server: ${err}`);
			expect.fail("Failed to stop server");
		}
	});

	beforeEach(async function () {
		// await server.stop();
		// await server.start();
		// Log.info("Server restarted for test isolation");
		// Remove the data directory to ensure a clean state
		// try {
		// 	await clearDisk(); // Ensure clearDisk correctly removes necessary directories/files
		// 	Log.info("Data directory cleared");
		// } catch (err) {
		// 	Log.error(`Failed to clear data directory: ${err}`);
		// 	expect.fail("Failed to clear data directory");
		// }
	});

	afterEach(function () {
		// Optional: Add cleanup or logging if necessary
	});

	async function addDataset(datasetId: string, kind: string, zipFilePath: string): Promise<void> {
		let zipData: Buffer;

		try {
			zipData = await fs.readFile(zipFilePath);
			Log.info(`Read ZIP file '${zipFilePath}' of size: ${zipData.length} bytes`);
		} catch (err) {
			Log.error(`Failed to read ZIP file '${zipFilePath}': ${err}`);
			throw new Error("Failed to read ZIP file");
		}

		try {
			const res = await request(SERVER_URL)
				.put(`/dataset/${datasetId}/${kind}`)
				.set("Content-Type", "application/x-zip-compressed")
				.send(zipData)
				.buffer(true);

			Log.info(`PUT /dataset response status: ${res.status}`);
			Log.info(`PUT /dataset response body: ${JSON.stringify(res.body)}`);

			expect(res.status).to.equal(StatusCodes.OK);
			expect(res.body).to.have.property("result");
			expect(res.body.result).to.be.an("array").that.includes(datasetId);
		} catch (err) {
			if (err instanceof Error) {
				Log.error(`Error adding dataset '${datasetId}': ${err.message}`);
			} else {
				Log.error(`Unknown error adding dataset '${datasetId}': ${err}`);
			}
			if (err instanceof Error && (err as any).response) {
				Log.error(`Response status: ${(err as any).response.status}`);
				Log.error(`Response body: ${JSON.stringify((err as any).response.body)}`);
			}
			throw new Error(`Failed to add: '${datasetId}': ${err instanceof Error ? err.message : String(err)}`);
		}
	}

	it("PUT test for sections dataset", async function () {
		const datasetId = "pair";
		const kind = "sections";
		const zipFilePath = path.join(__dirname, "../resources/archives/pair.zip");

		try {
			await addDataset(datasetId, kind, zipFilePath);
		} catch (err) {
			if (err instanceof Error) {
				expect.fail(err.message);
			} else {
				expect.fail("An unknown error occurred");
			}
		}
	});

	it("GET test for datasets", async function () {
		const ENDPOINT_URL = `/datasets`;

		try {
			const res = await request(SERVER_URL).get(ENDPOINT_URL);

			Log.info(`GET /datasets response status: ${res.status}`);
			Log.info(`GET /datasets response body: ${JSON.stringify(res.body)}`);

			expect(res.status).to.be.equal(StatusCodes.OK);
			expect(res.body).to.have.property("result");

			// // Example: Check if specific datasets are present
			// const datasetIds = res.body.result.map((dataset: any) => dataset.id);
			// expect(datasetIds).to.include.members(["pair", "pairtwo", "pair3", "pair4"]);

			// Add more assertions as needed based on preloaded datasets
		} catch (err) {
			Log.error(`Error in GET /datasets test: ${err}`);
			expect.fail("GET request failed");
		}
	});

	it("DELETE test for sections dataset", async function () {
		const datasetId = "pair3";
		const kind = "sections";
		const zipFilePath = path.join(__dirname, "../resources/archives/pair.zip");

		try {
			await addDataset(datasetId, kind, zipFilePath);
		} catch (err) {
			if (err instanceof Error) {
				expect.fail(err.message);
			} else {
				expect.fail("An unknown error occurred");
			}
		}

		const ENDPOINT_URL = `/dataset/${datasetId}`;

		try {
			const res = await request(SERVER_URL).delete(ENDPOINT_URL);

			Log.info(`DELETE /dataset response status: ${res.status}`);
			Log.info(`DELETE /dataset response body: ${JSON.stringify(res.body)}`);

			expect(res.status).to.be.equal(StatusCodes.OK);
			expect(res.body).to.have.property("result");
			expect(res.body.result).to.equal(datasetId);
		} catch (err) {
			Log.error(`Error in DELETE /dataset test: ${err}`);
			expect.fail("DELETE request failed");
		}
	});

	it("POST test for query", async function () {
		const datasetId = "ahahah";
		const kind = "sections";
		const zipFilePath = path.join(__dirname, "../resources/archives/pair.zip");
		const numbers = "110";
		const letters = "cpsc";

		// Add the dataset before performing the query
		try {
			await addDataset(datasetId, kind, zipFilePath);
		} catch (err) {
			if (err instanceof Error) {
				expect.fail(`Failed to add dataset before POST query test: ${err.message}`);
			} else {
				expect.fail("An unknown error occurred while adding dataset");
			}
		}

		const ENDPOINT_URL = `/query`;
		const query = {
			WHERE: {
				AND: [
					{
						IS: {
							[`${datasetId}_id`]: numbers,
						},
					},
					{
						IS: {
							[`${datasetId}_dept`]: letters.toLowerCase(),
						},
					},
				],
			},
			OPTIONS: {
				COLUMNS: [`${datasetId}_dept`, `${datasetId}_avg`],
			},
		};
		// const query = {
		// 	"WHERE": {
		// 	  "AND": [
		// 		{
		// 		  "IS": {
		// 			"pair4_id": numbers
		// 		  }
		// 		},
		// 		{
		// 		  "IS": {
		// 			"pair4_dept": letters
		// 		  }
		// 		}
		// 	  ]
		// 	},
		// 	"OPTIONS": {
		// 	  "COLUMNS": [
		// 		"pair4_dept",
		// 		"pair4_avg"
		// 	  ]
		// 	}
		//   };

		try {
			const res = await request(SERVER_URL).post(ENDPOINT_URL).send(query).set("Content-Type", "application/json");

			Log.info(`POST /query response status: ${res.status}`);
			Log.info(`POST /query response body: ${JSON.stringify(res.body)}`);

			expect(res.status).to.be.equal(StatusCodes.OK);
			expect(res.body).to.have.property("result");
			expect(res.body.result).to.be.an("array");
			// Add more assertions if necessary
		} catch (err: any) {
			Log.error(`Error in POST /query test: ${err.message}`);
			if (err.response) {
				Log.error(`Response status: ${err.response.status}`);
				Log.error(`Response body: ${JSON.stringify(err.response.body)}`);
			}
			expect.fail(`POST /query request failed: ${err.message}`);
		}
	});
});
