'use client'

// got from v0
import ViewSectionDatasets from '@/components/view-section-dataset'
import { useState, useEffect } from 'react'

export default function ViewDatasetsPage() {
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

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">View Section Datasets</h1>
      <ViewSectionDatasets datasets={datasets} />
    </div>
  )
}