import { IInsightFacade, InsightDataset, InsightDatasetKind, InsightResult , InsightError} from "./IInsightFacade";
import { unzipSync } from 'zlib';
import { Buffer } from 'buffer';

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */

class validateDataset {
	isValidBase64(str: string): boolean {
		try {
			Buffer.from(str, "base64");
			return true;
		} catch (err) {
			return false;
		}
	}

	isValidZip(base64Str: string): Buffer {
		try {
            const buffer = Buffer.from(base64Str, "base64");
            const zipContent = unzipSync(buffer);
            return zipContent;
        } catch (err) {
            throw new InsightError("Invalid zip file");
        }
	}

	containsCoursesDirectory(zipContent: Buffer): any[] {
        // Assuming zipContent contains the unzipped file structure
        const coursesDir = 'courses/';

        // Extract and list files in the 'courses/' directory
        const filePaths = this.extractFilePaths(zipContent);

        if (!filePaths.some(filePath => filePath.startsWith(coursesDir))) {
            throw new InsightError("No 'courses/' directory found in the zip");
        }

        // Return course files for further validation
        return filePaths.filter(filePath => filePath.startsWith(coursesDir));
    }

	// Check if the zip contains at least one valid section
	isValidCourse(courseFile: string): boolean {
        try {
            const courseJson = JSON.parse(courseFile);

            // Ensure the file contains a "result" key with valid sections
            if (!courseJson.result || !Array.isArray(courseJson.result)) {
                throw new Error("Invalid course structure, missing 'result' key");
            }

            // Check if at least one valid section exists
            return courseJson.result.some(section => this.isValidSection(section));
        } catch (err) {
            throw new Error("Invalid JSON format or structure in course");
        }
    }

	isValidSection(section: any): boolean {
		const requiredFields = ["result"];
		return requiredFields.every(field => field in section);
	}

	validDataset(base64Str: string): void {
		if (!this.isValidBase64(base64Str)) {
			throw new InsightError("Invalid dataset");
		}
		// unzip
		const zipContent = this.isValidZip(base64Str);

		if (!this.containsValidSection(zipContent)) {
			throw new InsightError("No valid sections found");
		}

		console.log("Dataset is valid");
	}
}

export default class InsightFacade implements IInsightFacade {
	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {

		if (!/^[^_]+$/.test(id) || !id.trim()) {
			throw new InsightError(`Invalid id: ${id}`)
		}

		try {
			const validator = new validateDataset();
			validator.validDataset(content);
		} catch (err) {
			throw err
		}
		return []
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
