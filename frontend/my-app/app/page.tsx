import { AddSectionDataset } from "@/components/add-section-dataset";
import SectionInsightsDashboard from "@/components/dashboard";

// got from v0

export default function Page() {
  return (
    <div className="container mx-auto py-8">
      {/* <AddSectionDataset /> */}
      <SectionInsightsDashboard></SectionInsightsDashboard>
      {/* Other components for removing datasets, viewing added datasets, etc. will go here */}
    </div>
  )
}