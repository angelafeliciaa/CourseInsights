'use client'

// GOT FROM V0

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Upload } from 'lucide-react'

export function AddSectionDataset() {
  const [datasetId, setDatasetId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null)

  // In your AddSectionDataset component
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!datasetId || !file) {
    setFeedback({ type: 'error', message: 'Please provide both Dataset ID and ZIP file.' });
    return;
  }

  try {
    const response = await fetch(`http://localhost:4321/dataset/${datasetId}/sections`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/zip' // Ensure this matches the expected content type
      },
      body: file // Send the raw file content
    });

    if (response.ok) {
      setFeedback({ type: 'success', message: 'Dataset added successfully!' });
      // Reset form
      setDatasetId('');
      setFile(null);
    } else {
      const errorData = await response.json();
      setFeedback({ type: 'error', message: errorData.error || 'Failed to add dataset. Please try again.' });
    }
  } catch (error) {
    setFeedback({ type: 'error', message: 'An error occurred. Please try again.' });
  }
};

  return (
    <div className="max-w-md mx-auto p-6 bg-background rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Add Sections Dataset</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="datasetId">Dataset ID</Label>
          <Input
            id="datasetId"
            type="text"
            value={datasetId}
            onChange={(e) => setDatasetId(e.target.value)}
            placeholder="Enter a unique Dataset ID"
            required
          />
        </div>
        <div>
          <Label htmlFor="file">Upload ZIP File</Label>
          <div className="flex items-center space-x-2">
            <Input
              id="file"
              type="file"
              accept=".zip"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              required
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => document.getElementById('file')?.click()}
            >
              <Upload className="mr-2 h-4 w-4" /> Choose File
            </Button>
            <span className="text-sm text-muted-foreground">
              {file ? file.name : 'No file chosen'}
            </span>
          </div>
        </div>
        <Button type="submit" className="w-full">Add Dataset</Button>
      </form>
      {feedback && (
        <Alert className={`mt-4 ${feedback.type === 'success' ? 'bg-green-100' : 'bg-red-100'}`}>
          <AlertTitle>{feedback.type === 'success' ? 'Success' : 'Error'}</AlertTitle>
          <AlertDescription>{feedback.message}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}