'use client'

// from ai

import { useState, useEffect } from 'react'
import RemoveSectionDataset from '@/components/remove-section-dataset'
import ViewSectionDatasets from '@/components/view-section-dataset'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AddSectionDataset } from '@/components/add-section-dataset'
import InsightsPage from './insights-page'

type Dataset = {
  id: string
  kind: string
  numRows: number
}

export default function SectionInsightsDashboard() {
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('view')

  // Fetch datasets from backend
  const fetchDatasets = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('http://localhost:4321/datasets')
      if (!response.ok) {
        throw new Error(`Error fetching datasets: ${response.statusText}`)
      }
      const data = await response.json()
      setDatasets(data.result)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch datasets.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDatasets()
  }, [])

  // Handler to add a new dataset
  const handleAddDataset = () => {
    fetchDatasets()
    setActiveTab('view')
  }

  // Handler to remove a dataset
  const handleRemoveDataset = () => {
    fetchDatasets()
  }

  const handleAddClick = () => {
    setActiveTab('add')
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <h1 className="text-3xl font-bold mb-8">Section Insights Dashboard</h1>
      
      {loading && <p>Loading datasets...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {!loading && !error && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList>
            <TabsTrigger value="view">View Datasets</TabsTrigger>
            <TabsTrigger value="add">Add Dataset</TabsTrigger>
            {/* <TabsTrigger value="remove">Remove Dataset</TabsTrigger> */}
            {/* <TabsTrigger value="insights">Insights</TabsTrigger> */}
          </TabsList>
          
          <TabsContent value="view">
            <ViewSectionDatasets datasets={datasets} onRemove={handleRemoveDataset} onAddClick={handleAddClick} />
          </TabsContent>
          
          <TabsContent value="add">
            <AddSectionDataset onAddDataset={handleAddDataset} />
          </TabsContent>
          
          {/* <TabsContent value="remove">
            <RemoveSectionDataset datasets={datasets} onRemove={handleRemoveDataset} />
          </TabsContent> */}

          {/* <TabsContent value="insights">
            <InsightsPage />
          </TabsContent> */}
        </Tabs>
      )}
    </div>
  )
}
function setActiveTab(arg0: string) {
    throw new Error('Function not implemented.')
}

