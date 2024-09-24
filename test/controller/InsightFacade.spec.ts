import {
	IInsightFacade,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
	ResultTooLargeError,
} from "../../src/controller/IInsightFacade";
import InsightFacade from "../../src/controller/InsightFacade";
import { clearDisk, getContentFromArchives, loadTestQuery } from "../TestUtil";

import { expect, use } from "chai";
import chaiAsPromised from "chai-as-promised";

use(chaiAsPromised);

export interface ITestQuery {
	title?: string;
	input: unknown;
	errorExpected: boolean;
	expected: any;
}

describe("InsightFacade", function () {
	let facade: IInsightFacade;

	// Declare datasets used in tests. You should add more datasets like this!
	let sections: string;
	let sections_invalid_json: string;
	let invalid_course: string;
	let invalid_section: string;
	let invalid_content: string;

	before(async function () {
		// This block runs once and loads the datasets.
		sections = await getContentFromArchives("pair.zip");
		sections_invalid_json = await getContentFromArchives(
			"invalid_json_format.zip"
		);
		invalid_course = await getContentFromArchives("invalid_course.zip");
		invalid_section = await getContentFromArchives("invalid_section.zip");
		invalid_content = await getContentFromArchives("invalid_content.zip");

		// Just in case there is anything hanging around from a previous run of the test suite
		await clearDisk();
	});

	describe("AddDataset", function () {
		beforeEach(function () {
			// This section resets the insightFacade instance
			// This runs before each test
			facade = new InsightFacade();
		});

		afterEach(async function () {
			// This section resets the data directory (removing any cached data)
			// This runs after each test, which should make each test independent of the previous one
			await clearDisk();
		});

		it("should reject with an empty dataset id", async function () {
			try {
				await facade.addDataset("", sections, InsightDatasetKind.Sections);
				expect.fail("Should have thrown above.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject with an only whitespace dataset id", async function () {
			try {
				await facade.addDataset(" ", sections, InsightDatasetKind.Sections);
				expect.fail("Should have thrown above.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject id with underscore", async function () {
			try {
				await facade.addDataset("_", sections, InsightDatasetKind.Sections);
				expect.fail("Should have thrown above.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject id with duplicates", async function () {
			await facade.addDataset("aaa", sections, InsightDatasetKind.Sections);
			try {
				await facade.addDataset("aaa", sections, InsightDatasetKind.Sections);
				expect.fail("Should have thrown above.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should successfully add a dataset (first)", async function () {
			const result = await facade.addDataset(
				"ubc",
				sections,
				InsightDatasetKind.Sections
			);

			expect(result).to.have.members(["ubc"]);
		});

		// empty file in it
		it("should reject with invalid section2", async function () {
			try {
				await facade.addDataset(
					"yey",
					sections_invalid_json,
					InsightDatasetKind.Sections
				);
				expect.fail("Should have thrown above.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		// removed result
		it("should reject with invalid section", async function () {
			try {
				await facade.addDataset(
					"yey",
					invalid_section,
					InsightDatasetKind.Sections
				);
				expect.fail("Should have thrown above.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		// txt file in it
		it("should reject with invalid content", async function () {
			try {
				await facade.addDataset(
					"yey",
					invalid_content,
					InsightDatasetKind.Sections
				);
				expect.fail("Should have thrown above.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject with invalid course", async function () {
			try {
				await facade.addDataset(
					"yey",
					invalid_course,
					InsightDatasetKind.Sections
				);
				expect.fail("Should have thrown above.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});
	});

	describe("RemoveDataset", function () {
		beforeEach(function () {
			// This section resets the insightFacade instance
			// This runs before each test
			facade = new InsightFacade();
		});

		afterEach(async function () {
			// This section resets the data directory (removing any cached data)
			// This runs after each test, which should make each test independent of the previous one
			await clearDisk();
		});

		it("should successfully remove", async function () {
			await facade.addDataset("ubc", sections, InsightDatasetKind.Sections);

			const result = await facade.removeDataset("ubc");
			expect(result).to.equal("ubc");
		});

		it("should reject with NotFoundError", async function () {
			try {
				await facade.removeDataset("ubc");
				expect.fail("Should have thrown below.");
			} catch (err) {
				expect(err).to.be.instanceOf(NotFoundError);
			}
		});

		it("should reject id with an empty dataset id", async function () {
			try {
				await facade.removeDataset("");
				expect.fail("Should have thrown below.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject id with underscore with InsightError", async function () {
			try {
				await facade.removeDataset("_");
				expect.fail("Should have thrown below.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject id with whitespace with InsightError", async function () {
			try {
				await facade.removeDataset(" ");
				expect.fail("Should have thrown below.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("remove the same key twice", async function () {
			await facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
			await facade.removeDataset("ubc");
			try {
				await facade.removeDataset("ubc");
				expect.fail("Should have thrown below.");
			} catch (err) {
				expect(err).to.be.instanceOf(NotFoundError);
			}
		});
	});

	describe("PerformQuery", function () {
		/**
		 * Loads the TestQuery specified in the test name and asserts the behaviour of performQuery.
		 *
		 * Note: the 'this' parameter is automatically set by Mocha and contains information about the test.
		 */
		async function checkQuery(this: Mocha.Context) {
			if (!this.test) {
				throw new Error(
					"Invalid call to checkQuery." +
						"Usage: 'checkQuery' must be passed as the second parameter of Mocha's it(..) function." +
						"Do not invoke the function directly."
				);
			}
			// Destructuring assignment to reduce property accesses
			const { input, expected, errorExpected } = await loadTestQuery(
				this.test.title
			);
			let result: InsightResult[];
			try {
				result = await facade.performQuery(input);
				if (errorExpected) {
					expect.fail(
						`performQuery resolved when it should have rejected with ${expected}`
					);
				} else {
					expect(result).to.deep.equal(expected);
				}
			} catch (err) {
				if (!errorExpected) {
					expect.fail(`performQuery threw unexpected error: ${err}`);
				} else if (expected == "InsightError") {
					expect(err).to.be.instanceOf(InsightError);
				} else if (expected == "ResultTooLargeError") {
					expect(err).to.be.instanceOf(ResultTooLargeError);
				}
			}
		}

		before(async function () {
			facade = new InsightFacade();

			// Add the datasets to InsightFacade once.
			// Will *fail* if there is a problem reading ANY dataset.
			const loadDatasetPromises: Promise<string[]>[] = [
				facade.addDataset("sections", sections, InsightDatasetKind.Sections),
			];

			try {
				await Promise.all(loadDatasetPromises);
			} catch (err) {
				throw new Error(
					`In PerformQuery Before hook, dataset(s) failed to be added. \n${err}`
				);
			}
		});

		after(async function () {
			await clearDisk();
		});

		// Examples demonstrating how to test performQuery using the JSON Test Queries.
		// The relative path to the query file must be given in square brackets.
		it("[valid/simple.json] SELECT dept, avg WHERE avg > 97", checkQuery);
		it("[invalid/invalid.json] Query missing WHERE", checkQuery);
		it(
			"[invalid/invalid_long.json] SELECT dept, avg WHERE avg == 0",
			checkQuery
		);
		it("[invalid/invalid_column.json] Query missing COLUMNS", checkQuery);
		it(
			"[invalid/invalid_mcomparatro.json] Query wrong MCOMPARATOR",
			checkQuery
		);
		it("[invalid/invalid_logic.json] Query wrong LOGIC", checkQuery);
		it("[invalid/invalid_negation.json] Invalid negation", checkQuery);
		it(
			"[invalid/invalid_scomparison.json] Invalid scomparison format",
			checkQuery
		);
		// it("[invalid/invalid_keylist.json] Invalid keylist", checkQuery);
		// it(
		// 	"[invalid/invalid_logiccomparison.json] Invalid logiccomparison",
		// 	checkQuery
		// );
	});

	describe("ListDatasets", function () {
		beforeEach(function () {
			// This section resets the insightFacade instance
			// This runs before each test
			facade = new InsightFacade();
		});

		afterEach(async function () {
			// This section resets the data directory (removing any cached data)
			// This runs after each test, which should make each test independent of the previous one
			await clearDisk();
		});

		it("should list one data", async function () {
			await facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
			const result = await facade.listDatasets();
			expect(result).to.deep.equal([
				{
					id: "ubc",
					kind: InsightDatasetKind.Sections,
					numRows: 64612,
				},
			]);
		});
	});
});
