### Setting workind directory
setwd("/Users/davidjacques/Documents/Projects/common_humanity_coalation_website/")

### Loading libraries
library(blogdown)

# new_site(theme = "HugoBlox/theme-research-group")

# Build the site
blogdown::build_site(build_rmd = TRUE)

# Optionally serve the site locally
serve_site()

blogdown::stop_server()
