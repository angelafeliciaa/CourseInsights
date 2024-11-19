'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Search, Trash2, Plus} from 'lucide-react'

type Dataset = {
  id: string
  kind: string
  numRows: number
}

export default function ViewSectionDatasets({ 
  datasets = [], 
  onRemove, 
  onAddClick 
}: { 
  datasets: Dataset[], 
  onRemove: (id: string) => void,
  onAddClick: () => void
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredDatasets, setFilteredDatasets] = useState(datasets)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null)

  const handleSearch = () => {
    const filtered = datasets.filter(dataset => 
      dataset.id.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setFilteredDatasets(filtered)
  }

  const handleRemove = async (id: string) => {
    try {
      const response = await fetch(`http://localhost:4321/dataset/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        onRemove(id)
        setFeedback({ type: 'success', message: `Dataset ${id} removed successfully!` })
      } else {
        const errorData = await response.json()
        setFeedback({ type: 'error', message: errorData.message || 'Failed to remove dataset. Please try again.' })
      }
    } catch (error) {
      setFeedback({ type: 'error', message: 'An error occurred. Please try again.' })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold mb-4">View and Manage Datasets</h2>
        <Button onClick={onAddClick} className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Add Dataset</span>
        </Button>
      </div>
      <div className="flex space-x-2">
        <Input
          type="text"
          placeholder="Search by Dataset ID"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Button onClick={handleSearch}>
          <Search className="mr-2 h-4 w-4" /> Search
        </Button>
      </div>
      {feedback && (
        <Alert className={`mt-4 ${feedback.type === 'success' ? 'bg-green-100' : 'bg-red-100'}`}>
          <AlertTitle>{feedback.type === 'success' ? 'Success' : 'Error'}</AlertTitle>
          <AlertDescription>{feedback.message}</AlertDescription>
        </Alert>
      )}
      {filteredDatasets.length === 0 ? (
        <p className="text-muted-foreground">No results found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDatasets.map((dataset) => (
            <Card key={dataset.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-medium">{dataset.id}</CardTitle>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => handleRemove(dataset.id)}
                  aria-label={`Remove dataset ${dataset.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Dataset Kind: {dataset.kind}</p>
                <p className="text-sm text-muted-foreground">Number of Rows: {dataset.numRows}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}