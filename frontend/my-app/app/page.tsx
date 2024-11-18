import { AddSectionDataset } from "@/components/add-section-dataset";

// got from v0

export default function Page() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Section Insights</h1>
      <AddSectionDataset />
      {/* Other components for removing datasets, viewing added datasets, etc. will go here */}
    </div>
  )
}