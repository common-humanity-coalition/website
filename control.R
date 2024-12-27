### Setting workind directory
setwd("/Users/davidjacques/Documents/Projects/common_humanity_coalation/website/")

### Loading libraries
library(pacman)
p_load(blogdown)

# Source helper functions
source("R/generate_pdfs.R")
source("R/deploy_site.R")

# Generate PDFs for reports
generate_report_pdfs("content/reports/tree-equity-score")

# new_site(theme = "HugoBlox/theme-research-group")

# Build the site
blogdown::build_site()

# Optionally serve the site locally
serve_site()

blogdown::stop_server()