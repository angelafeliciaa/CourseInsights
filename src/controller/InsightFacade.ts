import { IInsightFacade, InsightDataset, InsightDatasetKind, InsightResult, InsightError } from "./IInsightFacade";
import JSZip = require("jszip");
import fs = require("fs-extra");
import path = require("path");

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

	public async validDataset(base64Str: string): Promise<any[]> {
		const zipContent = await this.isValidZip(base64Str);
		const courseFiles = await this.isValidCourse(zipContent);
		const validSections: any[] = [];

		// check whether there is a valid section
		const sectionValidationPromises = courseFiles.map(async (file) => {
			const zipFile = zipContent.file(file);
			if (zipFile) {
				const fileContent = await zipFile.async("text");
				const jsonContent = JSON.parse(fileContent);
				// Check if the section is valid
				if (this.isValidSection(jsonContent)) {
					validSections.push(jsonContent);
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
	private datasetDirectory = "type";
	private datasetMap = new Map<string, any>();

	constructor() {
		fs.ensureDirSync(this.datasetDirectory);
	}

	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		if (!/^[^_]+$/.test(id) || !id.trim()) {
			throw new InsightError(`Invalid id: ${id}`);
		}

		const existingDatasetIds = await this.loadAllDatasetIdsFromDisk();
		if (existingDatasetIds.includes(id)) {
			throw new InsightError(`Dataset with id "${id}" already exists.`);
		}

		const validator = new ValidateDataset();
		if (kind === InsightDatasetKind.Sections) {
			const processedDataset = await validator.validDataset(content);
			await this.processSections(processedDataset, id);
		} else {
			throw new InsightError(`different kind`);
		}

		return Array.from(this.datasetMap.keys());
	}

	public async removeDataset(id: string): Promise<string> {
		// TODO: Remove this once you implement the methods!
		throw new Error(`InsightFacadeImpl::removeDataset() is unimplemented! - id=${id};`);
	}

	public async performQuery(query: unknown): Promise<InsightResult[]> {
		// TODO: Remove this once you implement the methods!
		throw new Error(`InsightFacadeImpl::performQuery() is unimplemented! - query=${query};`);
	}

	public async listDatasets(): Promise<InsightDataset[]> {
		// TODO: Remove this once you implement the methods!
		throw new Error(`InsightFacadeImpl::listDatasets is unimplemented!`);
	}

	private async loadAllDatasetIdsFromDisk(): Promise<string[]> {
		const files = await fs.readdir(this.datasetDirectory);
		return files.filter((file) => file.endsWith(".json")).map((file) => path.basename(file, ".json"));
	}

	private async processSections(datasetContent: any, id: string): Promise<void> {
		const sections = datasetContent.result.map((sectionData: any) => {
			const transformedData = this.transformSectionData(sectionData);
			return Section.fromData(transformedData);
		});

		this.datasetMap.set(id, sections);

		// Persist the processed sections to disk
		const filePath = path.join(this.datasetDirectory, `${id}.json`);
		await fs.writeJson(filePath, sections);
	}

	private transformSectionData(originalData: any): any {
		return {
			uuid: originalData.id,
			id: originalData.Course,
			title: originalData.Title,
			instructor: originalData.Professor,
			dept: originalData.Subject,
			year: originalData.Year,
			avg: originalData.Avg,
			pass: originalData.Pass,
			fail: originalData.Fail,
			audit: originalData.Audit,
		};
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

	constructor(
		uuid: string,
		id: string,
		title: string,
		instructor: string,
		dept: string,
		year: number,
		avg: number,
		pass: number,
		fail: number,
		audit: number
	) {
		this.uuid = uuid;
		this.id = id;
		this.title = title;
		this.instructor = instructor;
		this.dept = dept;
		this.year = year;
		this.avg = avg;
		this.pass = pass;
		this.fail = fail;
		this.audit = audit;
	}
	public static fromData(data: any): Section {
		return new Section(
			data.uuid, // Assuming `id` is passed as `uuid`
			data.id,
			data.title,
			data.instructor,
			data.dept,
			data.year,
			data.avg,
			data.pass,
			data.fail,
			data.audit
		);
	}
}
