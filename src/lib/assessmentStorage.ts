// Simple localStorage utility for assessments
export const assessmentStorage = {
  save: (assessment: any) => {
    try {
      const stored = localStorage.getItem("jobfit_assessments") || "[]"
      const assessments = JSON.parse(stored)
      assessments.unshift(assessment)
      localStorage.setItem("jobfit_assessments", JSON.stringify(assessments.slice(0, 100)))
    } catch (e) {
      console.error("Error saving assessment:", e)
    }
  },
  
  getAll: () => {
    try {
      return JSON.parse(localStorage.getItem("jobfit_assessments") || "[]")
    } catch (e) {
      console.error("Error loading assessments:", e)
      return []
    }
  },
}
