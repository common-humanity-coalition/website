### Setting workind directory
setwd("/Users/davidjacques/Documents/Projects/common_humanity_coalation_website/")

### Loading libraries
library(renv)
renv::load()


# new_site(theme = "HugoBlox/theme-research-group")

# Build the site
blogdown::build_site()

# Optionally serve the site locally
serve_site()

blogdown::stop_server()