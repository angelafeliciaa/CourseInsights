'use client'

// got from v0
import RemoveSectionDataset from '@/components/remove-section-dataset'
import { useState, useEffect } from 'react'

export default function RemoveDatasetPage() {
  const [datasets, setDatasets] = useState<{ id: string }[]>([])

  useEffect(() => {
    // Fetch datasets from API
    // For now, we'll use dummy data
    setDatasets([
      { id: 'dataset1' },
      { id: 'dataset2' },
      { id: 'dataset3' },
    ])
  }, [])

  const handleRemove = (id: string) => {
    setDatasets(datasets.filter(dataset => dataset.id !== id))
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Remove Section Dataset</h1>
      <RemoveSectionDataset datasets={datasets} onRemove={handleRemove} />
    </div>
  )
}