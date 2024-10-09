import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightResult,
	InsightError,
	NotFoundError,
} from "./IInsightFacade";
import JSZip = require("jszip");
import fs = require("fs-extra");

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
					const newSection = new Section(jsonContent);
					validSections.push(newSection);
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

class Section {
	public uuid: string;
	public id: string;
	public title: string;
	public instructor: string;
	public dept: string;
	public year: number;
	public avg: number;
	public pass: number;
	public fail: number;
	public audit: number;

	constructor(json: any) {
		const originalData = json;
		if (originalData.Section === "overall") {
			this.year = 1900;
		} else {
			this.year = parseInt(originalData.Year, 10);
		}
		this.uuid = originalData.id;
		this.id = originalData.Course;
		this.title = originalData.Title;
		this.instructor = originalData.Professor;
		this.dept = originalData.Subject;
		this.year = originalData.Year;
		this.avg = originalData.Avg;
		this.pass = originalData.Pass;
		this.fail = originalData.Fail;
		this.audit = originalData.Audit;
	}
}

export default class InsightFacade implements IInsightFacade {
	private existingDatasetIds: string[];

	constructor() {
		this.existingDatasetIds = [];
	}

	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		let jsonArray: [string, any[]][] = [];
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
				jsonArray.push([id, processedDataset]);
				const jsonString = JSON.stringify(jsonArray);
				await this.saveDataToDisk(jsonString);
				this.existingDatasetIds.push(id);
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
			this.existingDatasetIds.splice(this.existingDatasetIds.indexOf(id));
			const json = await this.loadDataFromDisk("./data/section.json");
			let newJsons = JSON.parse(json);
			newJsons = newJsons.filter(([key, _]: [string, string, any[]]) => {
				return key !== id;
			});

			const jsonFromString = JSON.stringify(newJsons);
			await this.saveDataToDisk(jsonFromString); // old version
			// let promise3 = await saveDataToDisk(jsonFromString);

			return id;
		} else {
			return Promise.reject(new NotFoundError());
		}
	}

	public async performQuery(query: unknown): Promise<InsightResult[]> {
		// TODO: Remove this once you implement the methods!
		throw new Error(`InsightFacadeImpl::performQuery() is unimplemented! - query=${query};`);
	}

	public async listDatasets(): Promise<InsightDataset[]> {
		// TODO: Remove this once you implement the methods!
		throw new Error(`InsightFacadeImpl::listDatasets is unimplemented!`);
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

	// private async processSections(datasetContent: any, id: string): Promise<void> {
	// 	const sections = await datasetContent.result.map((sectionData: any) => {
	// 		const transformedData = this.transformSectionData(sectionData);
	// 		return Section.fromData(transformedData);
	// 	});

	// 	this.datasetMap.set(id, sections);

	// 	// Persist the processed sections to disk
	// 	const filePath = path.join(this.datasetDirectory, `${id}.json`);
	// 	await fs.writeJson(filePath, sections);
	// }
}
