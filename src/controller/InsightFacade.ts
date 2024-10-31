import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightResult,
	InsightError,
	NotFoundError,
	ResultTooLargeError,
} from "./IInsightFacade";
import fs = require("fs-extra");
import { QueryHelper } from "./QueryHelper";
import { Section } from "./Section";
import { parseRooms } from "./RoomHelper";
import { Room } from "./Room";
import { ValidateDataset } from "./SectionsHelper";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */

export default class InsightFacade implements IInsightFacade {
	private existingDatasetIds: string[];
	private datasets: Map<string, Section[]>;

	constructor() {
		this.existingDatasetIds = [];
		this.datasets = new Map<string, Section[]>();
	}

	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		await this.loadDatasetsFromDisk();
		this.validateId(id);

		if (!this.existingDatasetIds.includes(id)) {
			// const validator = new ValidateDataset();
			if (kind === InsightDatasetKind.Sections) {
				return this.addSectionDataset(id, content);
			} else if (kind === InsightDatasetKind.Rooms) {
				return this.addRoomDataset(id, content);
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
			await this.saveDataToDisk(jsonFromString);

			// Remove the dataset from the datasets map
			this.datasets.delete(id);

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

	private validateId(id: string): void {
		if (!/^[^_]+$/.test(id) || !id.trim()) {
			throw new InsightError(`Invalid id: ${id}`);
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

	private async addSectionDataset(id: string, content: string): Promise<string[]> {
		let jsonArray: [string, string, any[]][] = [];
		const validator = new ValidateDataset();
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
		this.datasets.set(id, processedDataset);
		return Array.from(this.existingDatasetIds);
	}

	private async addRoomDataset(id: string, content: string): Promise<string[]> {
		let jsonArray: [string, string, any[]][] = [];
		const listOfRooms: Room[] = await parseRooms(content);
		if (listOfRooms.length !== 0) {
			if (this.existingDatasetIds.length !== 0) {
				const json = await this.loadDataFromDisk("./data/data.json");
				jsonArray = JSON.parse(json);
			}
			jsonArray.push([id, "room", listOfRooms]);
			const jsonString = JSON.stringify(jsonArray);
			await this.saveDataToDisk(jsonString);
			this.existingDatasetIds.push(id);
			return Array.from(this.existingDatasetIds);
		}
		return Promise.reject(new InsightError("Less than 0 valid rooms"));
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
