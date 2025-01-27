import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightResult,
	InsightError,
	NotFoundError,
} from "./IInsightFacade";
import fs = require("fs-extra");
import { Section } from "./Section";
import PerformQuery from "./PerformQuery";
import { parseRooms } from "./RoomHelper";
import { Room } from "./Room";
import { ValidateDataset } from "./SectionsHelper";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */

export type DataType = Section | Room;

export default class InsightFacade implements IInsightFacade {
	private existingDatasetIds: string[];
	private datasets: Map<string, DataType[]>;

	constructor() {
		this.existingDatasetIds = [];
		this.datasets = new Map<string, DataType[]>();
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
			const jsonArray: [string, string, any[]][] = await this.loadDataFromDisk("./data/section.json");
			const newJsons = jsonArray.filter(([key, _]) => key !== id);

			await this.saveDataToDisk(newJsons);

			// Remove the dataset from the datasets map
			this.datasets.delete(id);

			return id;
		} else {
			throw new NotFoundError(`Dataset with id ${id} not found.`);
		}
	}

	public readonly MAX_RESULTS = 5000;

	public async performQuery(query: unknown): Promise<InsightResult[]> {
		await this.loadDatasetsFromDisk();
		const performQuery = new PerformQuery(this.existingDatasetIds, this.datasets);
		// console.log(performQuery);
		return await performQuery.execute(query);
	}

	public async listDatasets(): Promise<InsightDataset[]> {
		const dataset: InsightDataset[] = [];
		const jsonArray: [string, string, any][] = await this.loadDataFromDisk("./data/section.json");
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
				const jsonArray: [string, any[]][] = await this.loadDataFromDisk("./data/section.json");
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
				jsonArray = await this.loadDataFromDisk("./data/section.json");
			}
		}
		jsonArray.push([id, "section", processedDataset]);
		await this.saveDataToDisk(jsonArray);
		this.existingDatasetIds.push(id);
		this.datasets.set(id, processedDataset);
		return Array.from(this.existingDatasetIds);
	}

	private async addRoomDataset(id: string, content: string): Promise<string[]> {
		let jsonArray: [string, string, any[]][] = [];
		const listOfRooms: Room[] = await parseRooms(content);
		if (listOfRooms.length !== 0) {
			if (this.existingDatasetIds.length !== 0) {
				jsonArray = await this.loadDataFromDisk("./data/section.json");
			}
			jsonArray.push([id, "room", listOfRooms]);
			await this.saveDataToDisk(jsonArray);
			this.existingDatasetIds.push(id);

			// Update the datasets map with the new room dataset
			this.datasets.set(id, listOfRooms);

			return Array.from(this.existingDatasetIds);
		}
		throw new InsightError("Less than 0 valid rooms");
	}

	private async createInsightData(id: string, kind: string, numRows: number): Promise<InsightDataset> {
		if (kind === "section") {
			const dataKind = InsightDatasetKind.Sections;
			return {
				id: id,
				kind: dataKind,
				numRows: numRows,
			};
		} else if (kind === "room") {
			const dataKind = InsightDatasetKind.Rooms;
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
