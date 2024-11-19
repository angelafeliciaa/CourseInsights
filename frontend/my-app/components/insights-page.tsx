'use client'
// from ai
import { useState, useEffect } from 'react'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

type Dataset = {
  id: string
  courseName: string
  averageGrade: number
  year: number
}

export default function InsightsPage() {
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [filteredDatasets, setFilteredDatasets] = useState<Dataset[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // In a real application, you would fetch this data from an API
    setDatasets([
      { id: 'dataset1', courseName: 'Math 101', averageGrade: 85, year: 2020 },
      { id: 'dataset2', courseName: 'Math 101', averageGrade: 87, year: 2021 },
      { id: 'dataset3', courseName: 'Math 101', averageGrade: 82, year: 2022 },
      { id: 'dataset4', courseName: 'Physics 201', averageGrade: 78, year: 2020 },
      { id: 'dataset5', courseName: 'Physics 201', averageGrade: 80, year: 2021 },
      { id: 'dataset6', courseName: 'Physics 201', averageGrade: 81, year: 2022 },
    ])
  }, [])

  const handleSearch = () => {
    if (!searchTerm.trim()) {
      setError('Please enter a course name.')
      setFilteredDatasets([])
      return
    }

    const filtered = datasets.filter(dataset => 
      dataset.courseName.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (filtered.length === 0) {
      setError('No matching courses found.')
      setFilteredDatasets([])
    } else {
      setError(null)
      setFilteredDatasets(filtered)
    }
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Course Insights</h1>
      
      <div className="space-y-4">
        <div className="flex space-x-2">
          <Input
            type="text"
            placeholder="Enter course name"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          <Button onClick={handleSearch}>Apply</Button>
        </div>
        
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>

      {filteredDatasets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Average Grades for {filteredDatasets[0].courseName}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={filteredDatasets}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="averageGrade" fill="#8884d8" name="Average Grade" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  )
}