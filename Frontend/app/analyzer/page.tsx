import { CVAnalyzer } from "@/components/cv-analyzer"
import { ProductShell } from "@/components/product-shell"

export const metadata = {
  title: "CV Analyzer — HR Advisor",
  description: "Upload your CV and get AI-powered, evidence-based recommendations",
}

export default function AnalyzerPage() {
  return (
    <ProductShell currentPath="/analyzer">
      <CVAnalyzer />
    </ProductShell>
  )
}
