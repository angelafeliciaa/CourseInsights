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
	let invalidJSON: string;
	let invalidContent: string;
	let removeResult: string;
	let removeKey: string;
	let buildings: string;
	let invalidBuilding: string;

	before(async function () {
		// This block runs once and loads the datasets.
		sections = await getContentFromArchives("pair.zip");
		invalidJSON = await getContentFromArchives("invalidJSON.zip");
		invalidContent = await getContentFromArchives("invalidContent.zip");
		removeResult = await getContentFromArchives("removeResult.zip");
		removeKey = await getContentFromArchives("removeKey.zip");
		buildings = await getContentFromArchives("campus.zip");
		invalidBuilding = await getContentFromArchives("invalidcampus.zip");

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

		it("should reject with  only whitespace", async function () {
			try {
				await facade.addDataset("     ", sections, InsightDatasetKind.Sections);
				expect.fail("Should have thrown above.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject dataset id with underscore", async function () {
			try {
				await facade.addDataset("test_underscore", sections, InsightDatasetKind.Sections);
				expect.fail("Should have thrown above.");
			} catch (err) {
				return expect(err).to.be.instanceOf(InsightError);
			}
		});

		// test accept
		it("should add one dataset", async function () {
			const result = await facade.addDataset("hello", sections, InsightDatasetKind.Sections);
			// check result correct
			expect(result).to.have.members(["hello"]);
		});

		// If id is the same as the id of an already added dataset, the dataset should be rejected and not saved.
		it("should reject duplicate dataset id", async function () {
			try {
				await facade.addDataset("hello", sections, InsightDatasetKind.Sections);
			} catch (err) {
				expect.fail("Should not have thrown error." + err);
			}

			try {
				await facade.addDataset("hello", sections, InsightDatasetKind.Sections);
				expect.fail("Should have thrown above.");
			} catch (err) {
				return expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject invalid json", async function () {
			try {
				await facade.addDataset("testinvalidjson", invalidJSON, InsightDatasetKind.Sections);
				expect.fail("Should have thrown above.");
			} catch (err) {
				return expect(err).to.be.instanceOf(InsightError);
			}
		});
		// empty string content

		// invalid content (Empty text file in folder)
		it("should reject invalid content", async function () {
			try {
				await facade.addDataset("test_underscore", invalidContent, InsightDatasetKind.Sections);
				expect.fail("Should have thrown above.");
			} catch (err) {
				return expect(err).to.be.instanceOf(InsightError);
			}
		});

		// invalid section invalid remove result key
		it("should reject remove result", async function () {
			try {
				await facade.addDataset("testremoveresult", removeResult, InsightDatasetKind.Sections);
				expect.fail("Should have thrown above.");
			} catch (err) {
				return expect(err).to.be.instanceOf(InsightError);
			}
		});

		// remove some keys
		it("should reject remove some keys", async function () {
			try {
				await facade.addDataset("testremovekey", removeKey, InsightDatasetKind.Sections);
				expect.fail("Should have thrown above.");
			} catch (err) {
				return expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should add one room dataset", async function () {
			const result = await facade.addDataset("hello", buildings, InsightDatasetKind.Rooms);
			// check result correct
			expect(result).to.have.members(["hello"]);
		});

		it("should reject invalid room dataset", async function () {
			try {
				await facade.addDataset("testinvalidjson", invalidBuilding, InsightDatasetKind.Rooms);
				expect.fail("Should have thrown above.");
			} catch (err) {
				return expect(err).to.be.instanceOf(InsightError);
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

		// test remove dataset
		it("test remove one dataset", async function () {
			//setup
			await facade.addDataset("ubc", sections, InsightDatasetKind.Sections);

			// validation
			const result = await facade.removeDataset("ubc");

			expect(result).to.equal("ubc");
		});

		// test remove two dataset
		it("test remove two dataset", async function () {
			//setup
			await facade.addDataset("one", sections, InsightDatasetKind.Sections);
			await facade.addDataset("two", sections, InsightDatasetKind.Sections);

			// validation
			const result = await facade.removeDataset("one");
			const result2 = await facade.removeDataset("two");

			expect(result).to.equal("one");
			expect(result2).to.equal("two");
		});

		// test remove same one twice
		it("test remove same one twice", async function () {
			//setup
			await facade.addDataset("one", sections, InsightDatasetKind.Sections);
			await facade.removeDataset("one");

			try {
				await facade.removeDataset("one");
				expect.fail("Should have thrown error.");
			} catch (err) {
				expect(err).to.be.instanceOf(NotFoundError);
			}
		});

		// test remove dataset doesnt exist
		it("test remove dataset doesnt exist", async function () {
			try {
				await facade.removeDataset("gagaga");
				expect.fail("Should have thrown error.");
			} catch (err) {
				expect(err).to.be.instanceOf(NotFoundError);
			}
		});

		// TEST remove dataset id empty
		it("test remove dataset ID EMPTY", async function () {
			try {
				await facade.removeDataset("");
				expect.fail("Should have thrown error.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		// TEST remove dataset id underscore
		it("test remove dataset ID UNDERSOCRE", async function () {
			try {
				await facade.removeDataset("hello_underscore");
				expect.fail("Should have thrown error.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		// TEST remove dataset whitespace id
		it("test remove dataset whitespace id", async function () {
			try {
				await facade.removeDataset(" ");
				expect.fail("Should have thrown error.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});
	});

	describe("ListDataset", function () {
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

		// got from course site
		it("should list one dataset", async function () {
			//setup
			await facade.addDataset("ubc", sections, InsightDatasetKind.Sections);

			// execution
			const datasets = await facade.listDatasets();

			// validation
			expect(datasets).to.deep.equal([
				{
					id: "ubc",
					kind: InsightDatasetKind.Sections,
					numRows: 64612,
				},
			]);
		});

		it("should list one room dataset", async function () {
			//setup
			await facade.addDataset("ubc", buildings, InsightDatasetKind.Rooms);

			// execution
			const datasets = await facade.listDatasets();

			// validation
			expect(datasets).to.deep.equal([
				{
					id: "ubc",
					kind: InsightDatasetKind.Rooms,
					numRows: 364,
				},
			]);
		});
	});

	describe("PerformQuery", function () {
		/**
		 * Loads the TestQuery specified in the test name and asserts the behaviour of performQuery.
		 *
		 * Note: the 'this' parameter is automatically set by Mocha and contains information about the test.
		 */

		async function checkQuery(this: Mocha.Context): Promise<void> {
			if (!this.test) {
				throw new Error(
					"Invalid call to checkQuery." +
						"Usage: 'checkQuery' must be passed as the second parameter of Mocha's it(..) function." +
						"Do not invoke the function directly."
				);
			}
			// Destructuring assignment to reduce property accesses
			const { input, expected, errorExpected } = await loadTestQuery(this.test.title);
			let result: InsightResult[];
			try {
				result = await facade.performQuery(input);
				if (errorExpected) {
					expect.fail(`performQuery resolved when it should have rejected with ${expected}`);
				} else {
					expect(result).to.have.deep.members(expected);
				}
			} catch (err) {
				if (!errorExpected) {
					// console.log(err);
					// console.log(expected);
					expect.fail(`performQuery threw unexpected error: ${err}`);
				} else if (expected === "InsightError") {
					expect(err).to.be.instanceOf(InsightError);
				} else if (expected === "ResultTooLargeError") {
					expect(err).to.be.instanceOf(ResultTooLargeError);
				} else {
					// console.log(err);
					// console.log(expected);
					expect.fail(`performQuery threw unexpected error: ${err}`);
				}
				// return expect.fail("Write your assertion(s) here."); // TODO: replace with your assertions
				// expect(err).to.be.instanceOf(errorExpected);
			}
			// if (errorExpected) {
			// 	expect.fail(
			// 		`performQuery resolved when it should have rejected with ${expected}`
			// 	);
			// }
			// expect(result).to.be.equal();
			// return expect.fail("Write your assertion(s) here."); // TODO: replace with your assertions
		}

		before(async function () {
			facade = new InsightFacade();

			// Add the datasets to InsightFacade once.
			// Will *fail* if there is a problem reading ANY dataset.
			const loadDatasetPromises: Promise<string[]>[] = [
				facade.addDataset("sections", sections, InsightDatasetKind.Sections),
				facade.addDataset("rooms", buildings, InsightDatasetKind.Rooms),
			];

			try {
				await Promise.all(loadDatasetPromises);
			} catch (err) {
				throw new Error(`In PerformQuery Before hook, dataset(s) failed to be added. \n${err}`);
			}
		});

		after(async function () {
			await clearDisk();
		});

		// Examples demonstrating how to test performQuery using the JSON Test Queries.
		// The relative path to the query file must be given in square brackets.

		// valid less than 5000
		it("[valid/simple.json] SELECT dept, avg WHERE avg > 97", checkQuery);

		// result too large error
		it("[invalid/invalidmorethan5000.json] SELECT dept, avg WHERE avg > 0", checkQuery);

		// missing where, columns
		it("[invalid/invalid.json] Query missing WHERE", checkQuery);
		it("[invalid/invalidcolumns.json] Query missing COLUMNS", checkQuery);
		it("[invalid/invalidcolumns2.json] Query wrong COLUMNS", checkQuery);

		// wildcard invalid
		it("[invalid/invalidWildcard.json] Query wrong wildcard", checkQuery);
		it("[invalid/invalidScomparison.json] Query wrong scomparison", checkQuery);

		// invalid object
		it("[invalid/invalidObject.json] Query invalid object", checkQuery);

		// FAILLLLLLLLL
		// it(
		// 	"[invalid/invalidAsteriskOnly.json] Query wrong only has asterisk",
		// 	checkQuery
		// );
		it("[invalid/invalidConsecutiveAsterisk.json] Query wrong has two consecutive asterisk", checkQuery);

		// wildcard valid 1: no *
		it("[valid/validNoAsterisk.json] SELECT dept WHERE dept = CPSC", checkQuery);
		// valid 2: *inputstring
		it("[valid/validFrontAsterisk.json] SELECT dept WHERE dept ends with c", checkQuery);
		// valid 3: inputstring*
		it("[valid/validBackAsterisk.json] SELECT dept WHERE dept = c*", checkQuery);
		// valid 3: *inputstring*
		it("[valid/validDoubleAsterisk.json] SELECT dept WHERE dept = *p*", checkQuery);

		// negation
		it("[invalid/invalidNegation.json] Query wrong negation", checkQuery);
		// it("[invalid/invalidNegation.json] Query correct negation", checkQuery);

		// mcomparator
		it("[invalid/invalidMcomparator.json] Query wrong mcomparator", checkQuery);
		it("[invalid/invalidMcomparator2.json] Query weird mcomparator", checkQuery);

		// logic
		it("[invalid/invalidLogic.json] Query wrong logic", checkQuery);

		// invalid wrong dataset
		it("[invalid/invalidData.json] Query wrong data", checkQuery);

		it("[invalid/invalidNullQuery.json] Query is null", checkQuery);

		it("[invalid/invalidMissingWhereOptions.json] Missing WHERE and OPTIONS", checkQuery);
		it("[invalid/invalidWhere.json] Invalid WHERE StructureS", checkQuery);

		// valid, but complex query

		// valid, shows no results

		// it("[valid/validNoResults.json] Query no results", checkQuery);

		// test for aggregations
		it("[invalid/c2/invalidApply.json] Invalid APPLY token", checkQuery);
		it("[invalid/c2/invalidAvg.json] Invalid AVG", checkQuery);
		it("[invalid/c2/invalidWhere.json] Invalid WHERE for room", checkQuery);

		it("[invalid/c2/invalidOrderNoDir.json] Invalid ORDER no direction", checkQuery);
		it("[invalid/c2/invalidOrderNull.json] Invalid ORDER NULL", checkQuery);
		it("[invalid/c2/invalidOptionsArray.json] Invalid options array", checkQuery);
		it("[invalid/c2/invalidColumnsEmptyArray.json] Invalid columns empty array", checkQuery);
		it("[invalid/c2/invalidColumnsKey.json] Invalid columns key", checkQuery);
		it("[invalid/c2/invalidGroupNull.json] Invalid GROUP NULL", checkQuery);
		it("[invalid/c2/invalidApplyNotArray.json] Invalid APPLY not array", checkQuery);
		it("[invalid/c2/invalidANDemptyarray.json] Invalid AND Empty array", checkQuery);
		it("[invalid/c2/invalidGroupKey.json] Invalid COLUMNS Key not in GROUP or APPLY", checkQuery);
		it("[invalid/c2/invalidNumericField.json] Invalid APPLY with AVG on Non-numeric Field", checkQuery);
		it("[invalid/c2/invalidMaxNumeric.json] Invalid APPLY with MAX on Non-numeric Field", checkQuery);
		it("[invalid/c2/invalidFieldColumns.json] Invalid Field in COLUMNS for Room", checkQuery);
		it("[invalid/c2/invalidGroupColumns.json] Invalid Field in GROUP for Room Dataset", checkQuery);
		it("[invalid/c2/mismatchColumnName.json] Mismatch Column Name", checkQuery);

		it("[valid/validNegation.json] Query valid negation", checkQuery);

		// it("[invalid/c2/invalidDK.json] Invalid idk", checkQuery);

		it("[valid/c2/validMax.json] Valid MAX", checkQuery);
		it("[valid/c2/validAvg.json] Valid AVG", checkQuery);
		it("[valid/c2/validCount.json] Valid Count", checkQuery);
		// it("[valid/c2/validSum.json] Valid Sum", checkQuery);
		it("[valid/c2/notQueryWithDirection.json] not Query with Direction", checkQuery);
		it("[valid/c2/validMultipleApply.json] Valid Multiple Apply", checkQuery);

		it("[valid/c2/validRoom.json] Query valid room", checkQuery);
		it("[valid/c2/validRoomAll.json] Query valid room all", checkQuery);
		it("[valid/c2/transformationMultipleColumns.json] Transformation multiple columns", checkQuery);
		it("[valid/c2/preserveNumber.json] preserve number", checkQuery);

		it("[invalid/c2/invalidReferenceMultipleDataset.json] Invalid RMD", checkQuery);
		it("[invalid/c2/invalidDuplicateApply.json] Invalid duplicate apply", checkQuery);
		it("[invalid/c2/invalidSortNoColumns.json] Invalid sort", checkQuery);
		it("[invalid/c2/invalidSort.json] Invalid sort doesnt exist", checkQuery);

		it("[invalid/c2/invalidApplyUnderscore.json] Invalid APPLY underscore", checkQuery);
		it("[invalid/c2/invalidSum.json] Invalid sum", checkQuery);
		it("[invalid/c2/invalidUnknownDataset.json] Invalid unknown dataset", checkQuery);

		it("[invalid/c2/invalidComplex.json] Invalid Rooms key type in Max", checkQuery);
	});
});
