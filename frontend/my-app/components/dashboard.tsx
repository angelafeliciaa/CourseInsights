'use client'

import { useState, useEffect } from 'react'
import RemoveSectionDataset from './remove-section-dataset'
// import ViewSectionDatasets from './view-section-datasets'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ViewSectionDatasets from './view-section-dataset'
import { AddSectionDataset } from './add-section-dataset'

type Dataset = {
  id: string
  dateAdded: string
  size: string
}

export default function SectionInsightsDashboard() {
  const [datasets, setDatasets] = useState<Dataset[]>([])

  useEffect(() => {
    // In a real application, you would fetch this data from an API
    setDatasets([
      { id: 'dataset1', dateAdded: '2023-05-15', size: '1.2 GB' },
      { id: 'dataset2', dateAdded: '2023-05-16', size: '800 MB' },
      { id: 'dataset3', dateAdded: '2023-05-17', size: '2.5 GB' },
    ])
  }, [])

  const handleAddDataset = (newDataset: Dataset) => {
    setDatasets([...datasets, newDataset])
  }

  const handleRemoveDataset = (id: string) => {
    setDatasets(datasets.filter(dataset => dataset.id !== id))
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <h1 className="text-3xl font-bold mb-8">Section Insights Dashboard</h1>
      
      <Tabs defaultValue="view" className="w-full">
        <TabsList>
          <TabsTrigger value="view">View Datasets</TabsTrigger>
          <TabsTrigger value="add">Add Dataset</TabsTrigger>
          <TabsTrigger value="remove">Remove Dataset</TabsTrigger>
        </TabsList>
        
        <TabsContent value="view">
          <ViewSectionDatasets datasets={datasets} />
        </TabsContent>
        
        <TabsContent value="add">
          {/* <AddSectionDataset onAddDataset={handleAddDataset} /> */}
          <AddSectionDataset></AddSectionDataset>
        </TabsContent>
        
        <TabsContent value="remove">
          <RemoveSectionDataset datasets={datasets} onRemove={handleRemoveDataset} />
        </TabsContent>
      </Tabs>
    </div>
  )
}