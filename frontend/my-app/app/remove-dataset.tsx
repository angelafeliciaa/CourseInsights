// RemoveSectionDataset.tsx from ai

'use client'

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

type Dataset = {
  id: string
  kind: string
  numRows: number
}

type RemoveSectionDatasetProps = {
  datasets: Dataset[]
  onRemove: () => void
}

export default function RemoveSectionDataset({ datasets, onRemove }: RemoveSectionDatasetProps) {
  const handleRemove = async (id: string) => {
    try {
      const response = await fetch(`http://localhost:4321/dataset/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        onRemove()
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Failed to remove dataset.')
      }
    } catch (error) {
      alert('An error occurred. Please try again.')
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-background rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Remove Section Dataset</h2>
      {datasets.length === 0 ? (
        <p>No datasets available to remove.</p>
      ) : (
        <ul className="space-y-4">
          {datasets.map(dataset => (
            <li key={dataset.id} className="flex justify-between items-center">
              <span>{dataset.id}</span>
              <Button variant="destructive" onClick={() => handleRemove(dataset.id)}>
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
