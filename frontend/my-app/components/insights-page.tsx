'use client'

import { useState } from 'react'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

// type Dataset = {
//   sections_year: number
//   sections_avg: number
//   sections_pass: number
//   sections_fail: number
//   sections_audit: number
// }

type Dataset = Record<string, number>;

type ProcessedData = {
  year: number
  avg: number
  totalStudents: number
  passRate: number
  failRate: number
  count: number
}

const COLORS = ['#F99244', '#FFE6B4', '#FFBB28', '#FF8042']

export default function InsightsPage({ id, onBack }: { id: string, onBack: () => void }) {
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [processedData, setProcessedData] = useState<ProcessedData[]>([])
  const [inputValue, setInputValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  const processData = (data: Dataset[]) => {
    const yearKey = `${id}_year`;
    const avgKey = `${id}_avg`;
    const passKey = `${id}_pass`;
    const failKey = `${id}_fail`;
    const auditKey = `${id}_audit`;
    const filteredData = data.filter(item => item[yearKey] !== 1900)

    const groupedData = filteredData.reduce((acc, item) => {
      const year = item[yearKey];
      if (!acc[year]) {
        acc[year] = {
          year: item[yearKey],
          totalAvg: 0,
          totalPass: 0,
          totalFail: 0,
          totalAudit: 0,
          count: 0
        };
      }
      acc[year].totalAvg += item[avgKey];
      acc[year].totalPass += item[passKey];
      acc[year].totalFail += item[failKey];
      acc[year].totalAudit += item[auditKey];
      acc[year].count += 1;
      return acc;
    }, {} as Record<number, { year: number; totalAvg: number; totalPass: number; totalFail: number; totalAudit: number, count: number }>);

    const processedData = Object.values(groupedData)
    .map(group => {
      const totalStudents = group.totalPass + group.totalFail + group.totalAudit;
      return {
        year: group.year,
        avg: parseFloat((group.totalAvg / group.count).toFixed(2)),
        totalStudents,
        passRate: parseFloat(((group.totalPass / totalStudents) * 100).toFixed(2)),
  failRate: parseFloat(((group.totalFail / totalStudents) * 100).toFixed(2)),
        count: group.count
      };
    })
    .sort((a, b) => a.year - b.year);
    setProcessedData(processedData)
  }

  const handleApply = async () => {
    setError(null)

    // Validate input
    if (inputValue.length !== 7) {
      setError('Input must be exactly 7 characters long.')
      return
    }

    const letters = inputValue.slice(0, 4)
    const numbers = inputValue.slice(4)

    if (!/^[A-Za-z]{4}$/.test(letters)) {
      setError('First 4 characters must be letters.')
      return
    }

    if (!/^\d{3}$/.test(numbers)) {
      setError('Last 3 characters must be numbers.')
      return
    }

    // Construct query
    const query = {
      "WHERE": {
        "AND": [
          {
            "IS": {
              [`${id}_id`]: numbers
            }
          },
          {
            "IS": {
              [`${id}_dept`]: letters.toLowerCase()
            }
          }
        ]
      },
      "OPTIONS": {
        "COLUMNS": [
          `${id}_year`,
          `${id}_avg`,
          `${id}_pass`,
          `${id}_fail`,
          `${id}_audit`,
        ]
      }
    }

    try {
      // Perform POST request
      const response = await fetch(`http://localhost:4321/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(query)
      })

      if (response.ok) {
        const data = await response.json()
        console.log(data)
        setDatasets(data.result)
        processData(data.result)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'An error occurred while fetching data.')
      }
    } catch (error) {
      console.error('Fetch error:', error)
      setError(`Failed to fetch data. ${error}`)
    }
  }

  return (
    <div className="space-y-8">
      {onBack && (
        <Button onClick={onBack} className="mb-4">
          Back to Datasets
        </Button>
      )}

      <h1 className="text-3xl font-bold">Course Insights</h1>
      <div className="space-y-4">
        <div className="flex space-x-2">
          <Input
            type="text"
            placeholder="Enter 4 letters followed by 3 numbers"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="max-w-sm"
          />
          <Button onClick={handleApply}>Apply</Button>
        </div>
        
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>

      {processedData.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Historical Averages</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={processedData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="right" dataKey="avg" fill="#F99244" name="Average Grade" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pass/Fail Rates</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Pass Rate', value: processedData[processedData.length - 1].passRate },
                      { name: 'Fail Rate', value: processedData[processedData.length - 1].failRate },
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={150}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {processedData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Total Students</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={processedData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="right" dataKey="totalStudents" fill="#F99244" name="Total Students" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}