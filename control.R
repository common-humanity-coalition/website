### Setting working directory
setwd("/Users/davidjacques/Documents/Projects/common_humanity_coalation/Projects/website/")

### Initialize renv (if needed) and restore packages
if (!requireNamespace("renv", quietly = TRUE)) {
  install.packages("renv")
}

# Restore packages from lockfile
# renv::restore()

# Now we can load blogdown
library(blogdown)

# Build the site
blogdown::build_site(build_rmd = TRUE)

# Optionally serve the site locally
# uncomment the line below to serve the site
blogdown::serve_site()

# Stop the server when done
# blogdown::stop_server()
