# An optional custom script to run before Hugo builds your site.
# You can delete it if you do not need it.


# Source helper functions
source("R/generate_pdfs.R")

# Generate PDFs for reports
generate_report_pdfs("content/reports/tree-equity-score")