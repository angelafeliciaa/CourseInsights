// got from llm
import { expect } from "chai";
import request from "supertest";
import { StatusCodes } from "http-status-codes";
import Log from "@ubccpsc310/folder-test/build/Log";
import Server from "../../src/rest/Server";
import fs from "fs-extra";
import path from "path";

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
		// Remove the data directory to ensure a clean state
		try {
			await fs.remove("./data");
			Log.info("Data directory removed");
		} catch (err) {
			Log.error(`Failed to remove data directory: ${err}`);
			expect.fail("Failed to remove data directory");
		}
	});

	afterEach(function () {
		// might want to add some process logging here to keep track of what is going on
	});

	// it.only("PUT test for sections dataset", async function () {
	// 	const datasetId = "cpsc";
	// 	const kind = "sections";
	// 	const ENDPOINT_URL = `/dataset/${datasetId}/${kind}`;
	// 	const zipFilePath = path.join(__dirname, "../resources/archives/cpsc.zip");
	// 	let ZIP_FILE_DATA: Buffer;

	// 	try {
	// 		ZIP_FILE_DATA = await fs.readFile(zipFilePath);
	// 		// console.log(ZIP_FILE_DATA);
	// 	} catch (err) {
	// 		Log.error(`Failed to read ZIP file: ${err}`);
	// 		expect.fail("Failed to read ZIP file");
	// 	}

	// 	try {
	// 		console.log("hi");
	// 		const res = await request(SERVER_URL)
	// 			.put(ENDPOINT_URL)
	// 			.send(ZIP_FILE_DATA)
	// 			.set("Content-Type", "application/x-zip-compressed");

	// 		Log.info(`Response status: ${res.status}`);
	// 		Log.info(`Response body: ${JSON.stringify(res.body)}`);
	// 		expect(res.status).to.be.equal(StatusCodes.OK);
	// 		expect(res.body).to.have.property("result");
	// 		expect(res.body.result).to.be.an("array").that.includes(datasetId);
	// 	} catch (err) {
	// 		Log.error(`Error in PUT test: ${err}`);
	// 		expect.fail("PUT request failed");
	// 	}
	// });

	// it("PUT test for courses dataset", function () {
	// 	const SERVER_URL = "http://localhost:4321";
	// 	const ENDPOINT_URL = "/dataset/${datasetId}/${kind}";
	// 	const ZIP_FILE_DATA = "TBD";
	// 	try {
	// 		return request(SERVER_URL)
	// 			.put(ENDPOINT_URL)
	// 			.send(ZIP_FILE_DATA)
	// 			.set("Content-Type", "application/x-zip-compressed")
	// 			.then(function (res: Response) {
	// 				// some logging here please!
	// 				expect(res.status).to.be.equal(StatusCodes.OK);
	// 			})
	// 			.catch(function () {
	// 				// some logging here please!
	// 				expect.fail();
	// 			});
	// 	} catch (err) {
	// 		Log.error(err);

	it("PUT test for sections dataset", async function () {
		const datasetId = "pair";
		const kind = "sections";
		const ENDPOINT_URL = `/dataset/${datasetId}/${kind}`;
		const zipFilePath = path.join(__dirname, "../resources/archives/pair.zip"); // Ensure correct path

		let ZIP_FILE_DATA: Buffer;

		try {
			// Read the ZIP file as a Buffer (raw binary data)
			ZIP_FILE_DATA = await fs.readFile(zipFilePath);
			Log.info(`Read ZIP file of size: ${ZIP_FILE_DATA.length} bytes`);
		} catch (err) {
			Log.error(`Failed to read ZIP file: ${err}`);
			expect.fail("Failed to read ZIP file");
			return;
		}

		try {
			const res = await request(SERVER_URL)
				.put(ENDPOINT_URL)
				.set("Content-Type", "application/x-zip-compressed")
				.send(ZIP_FILE_DATA) // Send raw Buffer
				.buffer(true); // Ensure Supertest handles buffer correctly

			// Log response details
			Log.info(`Response status: ${res.status}`);
			Log.info(`Response body: ${JSON.stringify(res.body)}`);

			// Assertions
			expect(res.status).to.equal(StatusCodes.OK);
			expect(res.body).to.have.property("result");
			expect(res.body.result).to.be.an("array").that.includes(datasetId);
		} catch (err: any) {
			Log.error("Test error details:");
			Log.error(`Error message: ${err.message}`);
			if (err.response) {
				Log.error(`Response status: ${err.response.status}`);
				Log.error(`Response body: ${JSON.stringify(err.response.body)}`);
			}
			expect.fail(`PUT request failed: ${err.message}`);
		}
	});

	it("GET test for listing datasets", async function () {
		const ENDPOINT_URL = `/datasets`;

		try {
			const res = await request(SERVER_URL).get(ENDPOINT_URL);

			Log.info(`Response status: ${res.status}`);
			expect(res.status).to.be.equal(StatusCodes.OK);
			expect(res.body).to.have.property("result");
			expect(res.body.result).to.be.an("array");
			// Add more assertions if necessary
		} catch (err) {
			Log.error(`Error in GET test: ${err}`);
			expect.fail("GET request failed");
		}
	});

	it("DELETE test for sections dataset", async function () {
		const datasetId = "sections";
		const ENDPOINT_URL = `/dataset/${datasetId}`;

		try {
			const res = await request(SERVER_URL).delete(ENDPOINT_URL);

			Log.info(`Response status: ${res.status}`);
			expect(res.status).to.be.equal(StatusCodes.OK);
			expect(res.body).to.have.property("result");
			expect(res.body.result).to.equal(datasetId);
		} catch (err) {
			Log.error(`Error in DELETE test: ${err}`);
			expect.fail("DELETE request failed");
		}
	});

	it("POST test for query", async function () {
		const ENDPOINT_URL = `/query`;
		const query = {
			WHERE: {},
			OPTIONS: {
				COLUMNS: ["courses_dept", "courses_avg"],
				ORDER: "courses_avg",
			},
		};

		try {
			const res = await request(SERVER_URL).post(ENDPOINT_URL).send(query).set("Content-Type", "application/json");

			Log.info(`Response status: ${res.status}`);
			expect(res.status).to.be.equal(StatusCodes.OK);
			expect(res.body).to.have.property("result");
			expect(res.body.result).to.be.an("array");
			// Add more assertions if necessary
		} catch (err) {
			Log.error(`Error in POST query test: ${err}`);
			expect.fail("POST query request failed");
		}
	});

	// The other endpoints work similarly. You should be able to find all instructions in the supertest documentation
});
