'use client'
// got from v0
import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Trash2 } from 'lucide-react'

type Dataset = {
  id: string
  // Add other relevant properties here
}

export default function RemoveSectionDataset({ datasets = [], onRemove }: { datasets?: Dataset[], onRemove: (id: string) => void }) {
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null)

  const handleRemove = async (id: string) => {
    try {
      // Replace with your actual API endpoint
      const response = await fetch(`/api/remove-section-dataset/${id}`, {
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
      <h2 className="text-2xl font-bold mb-4">Remove Sections Dataset</h2>
      {datasets.length === 0 ? (
        <p className="text-muted-foreground">No datasets available.</p>
      ) : (
        <ul className="space-y-2">
          {datasets.map((dataset) => (
            <li key={dataset.id} className="flex items-center justify-between p-2 bg-background rounded-md shadow">
              <span>{dataset.id}</span>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleRemove(dataset.id)}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
      {feedback && (
        <Alert className={`mt-4 ${feedback.type === 'success' ? 'bg-green-100' : 'bg-red-100'}`}>
          <AlertTitle>{feedback.type === 'success' ? 'Success' : 'Error'}</AlertTitle>
          <AlertDescription>{feedback.message}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}