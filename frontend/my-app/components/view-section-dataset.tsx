// got from v0
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"

type Dataset = {
  id: string
  // Add other relevant properties here, such as dateAdded, size, etc.
}

export default function ViewSectionDatasets({ datasets = [] }: { datasets?: Dataset[] }) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold mb-4">View Added Datasets</h2>
      {datasets.length === 0 ? (
        <p className="text-muted-foreground">No datasets available.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {datasets.map((dataset) => (
            <Card key={dataset.id}>
              <CardHeader>
                <CardTitle>{dataset.id}</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Add more dataset information here */}
                <p className="text-sm text-muted-foreground">Date Added: {/* Add date */}</p>
                <p className="text-sm text-muted-foreground">Size: {/* Add size */}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}