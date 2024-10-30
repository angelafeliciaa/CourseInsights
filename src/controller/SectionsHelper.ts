import JSZip = require("jszip");
import { Section } from "./Section";
import { InsightError } from "./IInsightFacade";

export class ValidateDataset {
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
