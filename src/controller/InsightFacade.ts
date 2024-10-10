import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightResult,
	InsightError,
	NotFoundError,
	ResultTooLargeError,
} from "./IInsightFacade";
import JSZip = require("jszip");
import fs = require("fs-extra");
import { QueryHelper } from "./QueryHelper";
import { Section } from "./Section";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */

class ValidateDataset {
	public async isValidZip(base64Str: string): Promise<JSZip> {
		try {
			const zip = new JSZip();
			const zipContent = await zip.loadAsync(base64Str, { base64: true });
			return zipContent;
		} catch {
			throw new InsightError("Invalid zip file");
		}
	}

	// Check if the zip contains at least one valid section
	public async isValidCourse(zip: JSZip): Promise<string[]> {
		const coursesDir = "courses/";
		const files = Object.keys(zip.files);
		if (!files.some((filePath) => filePath.startsWith(coursesDir))) {
			throw new InsightError("No 'courses/' directory found in the zip");
		}
		return files.filter((filePath) => filePath.startsWith(coursesDir));
	}

	public isValidSection(section: any): boolean {
		const requiredFields = ["result"];
		return requiredFields.every((field) => field in section);
	}

	public async validDataset(base64Str: string): Promise<Section[]> {
		const zipContent = await this.isValidZip(base64Str);
		const courseFiles = await this.isValidCourse(zipContent);
		const validSections: Section[] = [];

		// check whether there is a valid section
		const sectionValidationPromises = courseFiles.map(async (file) => {
			const zipFile = zipContent.file(file);
			if (zipFile) {
				const fileContent = await zipFile.async("text");
				const jsonContent = JSON.parse(fileContent);
				// Check if the section is valid
				if (this.isValidSection(jsonContent)) {
					for (const section of jsonContent.result) {
						if (!section.id || !section.Course || !section.Subject) {
							continue;
						}
						const newSection = new Section(section);
						validSections.push(newSection);
					}
				}
			}
		});

		await Promise.all(sectionValidationPromises);

		if (validSections.length === 0) {
			throw new InsightError("No valid sections found");
		}
		return validSections;
	}
}

export default class InsightFacade implements IInsightFacade {
	private existingDatasetIds: string[];
	private datasets: Map<string, Section[]>;

	constructor() {
		this.existingDatasetIds = [];
		this.datasets = new Map<string, Section[]>();
	}

	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		let jsonArray: [string, string, any[]][] = [];
		await this.loadDatasetsFromDisk();
		if (!/^[^_]+$/.test(id) || !id.trim()) {
			throw new InsightError(`Invalid id: ${id}`);
		}
		if (!this.existingDatasetIds.includes(id)) {
			const validator = new ValidateDataset();
			if (kind === InsightDatasetKind.Sections) {
				const processedDataset = await validator.validDataset(content);
				if (processedDataset.length !== 0) {
					if (this.existingDatasetIds.length !== 0) {
						const json = await this.loadDataFromDisk("./data/section.json");
						jsonArray = JSON.parse(json);
					}
				}
				jsonArray.push([id, "section", processedDataset]);
				const jsonString = JSON.stringify(jsonArray);
				await this.saveDataToDisk(jsonString);
				this.existingDatasetIds.push(id);

				// Store the dataset in the datasets map
				this.datasets.set(id, processedDataset);

				return Array.from(this.existingDatasetIds);
			} else {
				throw new InsightError(`different kind`);
			}
		} else {
			throw new InsightError(`Duplicated id: ${id}`);
		}
	}

	public async removeDataset(id: string): Promise<string> {
		await this.loadDatasetsFromDisk();
		if (!/^[^_]+$/.test(id) || !id.trim()) {
			throw new InsightError(`Invalid id: ${id}`);
		}

		if (this.existingDatasetIds.includes(id)) {
			this.existingDatasetIds.splice(this.existingDatasetIds.indexOf(id), 1);
			const json = await this.loadDataFromDisk("./data/section.json");
			let newJsons = JSON.parse(json);
			newJsons = newJsons.filter(([key, _]: [string, string, any[]]) => {
				return key !== id;
			});

			const jsonFromString = JSON.stringify(newJsons);
			await this.saveDataToDisk(jsonFromString); // old version
			// let promise3 = await saveDataToDisk(jsonFromString);

			// Remove the dataset from the datasets map
			this.datasets["delete"](id);

			return id;
		} else {
			return Promise.reject(new NotFoundError());
		}
	}

	public readonly MAX_RESULTS = 5000;

	public async performQuery(query: unknown): Promise<InsightResult[]> {
		// Create an instance of QueryHelper
		const queryHelper = new QueryHelper(this.existingDatasetIds, this.datasets);

		// Validate that the query is an object
		queryHelper.checkValidQuery(query);

		const queryObj = query as any; // Cast to any for easier access

		// Get the dataset id from the query
		const datasetId = queryHelper.getDatasetIdFromQuery(queryObj);

		// Check that the dataset has been added
		if (!this.existingDatasetIds.includes(datasetId)) {
			throw new InsightError(`Dataset ${datasetId} not found.`);
		}

		// Get the dataset data
		const datasetData = this.datasets.get(datasetId);
		if (!datasetData) {
			throw new InsightError(`Dataset data for ${datasetId} not found.`);
		}

		// Apply the WHERE clause to filter the data
		const filteredData = queryHelper.applyWhereClause(datasetData, queryObj.WHERE, datasetId); 

		// Apply OPTIONS (COLUMNS, ORDER) to get the results
		const results = queryHelper.applyOptions(filteredData, queryObj.OPTIONS, datasetId); 

		// Check if the results are too large
		if (results.length > this.MAX_RESULTS) {
			throw new ResultTooLargeError();
		}

		return results;
	}

	public async listDatasets(): Promise<InsightDataset[]> {
		const dataset: InsightDataset[] = [];
		const jsonString = await this.loadDataFromDisk("./data/section.json");
		const jsonArray: [string, string, any][] = JSON.parse(jsonString);
		const promises = jsonArray.map(async ([id, kind, value]) => {
			return this.createInsightData(id, kind, value.length);
		});
		const results = await Promise.all(promises);
		dataset.push(...results);
		return dataset;
	}

	public async loadDatasetsFromDisk(): Promise<void> {
		try {
			const fileExists = await fs.pathExists("./data/section.json");
			if (fileExists && this.existingDatasetIds.length === 0) {
				const json = await this.loadDataFromDisk("./data/section.json");
				const jsonArray: [string, any[]][] = JSON.parse(json);
				for (const [id] of jsonArray) {
					this.existingDatasetIds.push(id);
				}
			} else if (this.existingDatasetIds.length === 0) {
				await this.saveDataToDisk("");
			}
		} catch (e) {
			return Promise.reject(new InsightError(`loading data failed: ${e}`));
		}
	}

	private async loadDataFromDisk(filePath: string): Promise<any> {
		try {
			const dataString = await fs.readJSON(filePath);
			return dataString;
		} catch (error) {
			return Promise.reject(`loaddata: ${error}`);
		}
	}

	private async saveDataToDisk(data: any): Promise<void> {
		try {
			const directoryPath = "./data";
			await fs.ensureDir(directoryPath);
			const filePath = `${directoryPath}/section.json`;
			await fs.writeJSON(filePath, data);
		} catch (error) {
			throw new Error(`saveDataToDisk: ${error}`);
		}
	}

	private async createInsightData(id: string, kind: string, numRows: number): Promise<InsightDataset> {
		if (kind === "section") {
			const dataKind = InsightDatasetKind.Sections;
			return {
				id: id,
				kind: dataKind,
				numRows: numRows,
			};
		} else {
			throw new InsightError(`different kind`);
		}
	}
}
