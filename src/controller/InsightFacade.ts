import { IInsightFacade, InsightDataset, InsightDatasetKind, InsightResult, InsightError } from "./IInsightFacade";
import JSZip = require("jszip");
// import fs = require("fs-extra");

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

	public async validDataset(base64Str: string): Promise<void> {
		const zipContent = await this.isValidZip(base64Str);
		const courseFiles = await this.isValidCourse(zipContent);

		// check whether there is a valid section
		const sectionValidationPromises = courseFiles.map(async (file) => {
			const zipFile = zipContent.file(file);
			if (zipFile) {
				const fileContent = await zipFile.async("text");
				const jsonContent = JSON.parse(fileContent);
				// Check if the section is valid
				return this.isValidSection(jsonContent);
			}
			return false;
		});

		const validationResults = await Promise.all(sectionValidationPromises);

		if (!validationResults.some((isValid) => isValid)) {
			throw new InsightError("No valid sections found");
		}

		console.log("Dataset is valid");
	}
}

export default class InsightFacade implements IInsightFacade {
	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		if (!/^[^_]+$/.test(id) || !id.trim()) {
			throw new InsightError(`Invalid id: ${id}`);
		}

		const validator = new ValidateDataset();
		if (kind === InsightDatasetKind.Sections) {
			await validator.validDataset(content); // Assuming this checks for Sections
		} else {
			throw new InsightError(`different kind`);
		}
		
		return [];
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
}
