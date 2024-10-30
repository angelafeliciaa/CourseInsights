import { InsightResult, InsightError, ResultTooLargeError } from "./IInsightFacade";
import { QueryHelper } from "./QueryHelper";

export default class PerformQuery {
	private existingDatasetIds: string[];
	private datasets: Map<string, any>;

	constructor(existingDatasetIds: string[], datasets: Map<string, any>) {
		this.existingDatasetIds = existingDatasetIds;
		this.datasets = datasets;
	}

	public async execute(query: unknown): Promise<InsightResult[]> {
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
		if (results.length > 5000) {
			// Assuming MAX_RESULTS is 5000
			throw new ResultTooLargeError();
		}

		return results;
	}
}
