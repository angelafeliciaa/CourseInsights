// ViewSectionDatasets.tsx from ai

'use client'

type Dataset = {
  id: string
  kind: string
  numRows: number
}

type ViewSectionDatasetsProps = {
  datasets: Dataset[]
}

export default function ViewSectionDatasets({ datasets }: ViewSectionDatasetsProps) {
  return (
    <div className="max-w-2xl mx-auto p-6 bg-background rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Available Section Datasets</h2>
      {datasets.length === 0 ? (
        <p>No datasets available.</p>
      ) : (
        <table className="min-w-full bg-white">
          <thead>
            <tr>
              <th className="py-2">Dataset ID</th>
              <th className="py-2">Kind</th>
              <th className="py-2">Number of Rows</th>
            </tr>
          </thead>
          <tbody>
            {datasets.map(dataset => (
              <tr key={dataset.id} className="text-center">
                <td className="py-2">{dataset.id}</td>
                <td className="py-2">{dataset.kind}</td>
                <td className="py-2">{dataset.numRows}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
