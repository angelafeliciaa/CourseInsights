import { IInsightFacade, InsightDataset, InsightDatasetKind, InsightResult } from "./IInsightFacade";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {

		// validate zip file 

		// parsing data

		// got from AI
		// Validate id format
		if (!/^[^_]+$/.test(id) || !id.trim()) {
			throw new Error(`Invalid id: ${id}`);
		}

		// Validate zip file (pseudo-validation for example)
		if (!content || !content.startsWith("UEsDB")) { // Assuming valid zip files start with "UEsDB"
			throw new Error(`Invalid content for dataset: ${id}`);
		}

		// Check if dataset with the same id already exists
		const existingDatasets = await this.listDatasets();
		if (existingDatasets.some(dataset => dataset.id === id)) {
			throw new Error(`Dataset with id ${id} already exists.`);
		}

		// TODO: Process the dataset and save to disk
		// Example: await this.saveDataset(id, content, kind);

		// Return the list of dataset ids
		return existingDatasets.map(dataset => dataset.id).concat(id);
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
