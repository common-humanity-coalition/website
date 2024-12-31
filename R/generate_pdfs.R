# Script to generate PDFs from R Markdown files
renv::load()

#' Generate PDFs from R Markdown files in a directory
#' 
#' @param source_dir Path to the directory containing R Markdown files (e.g., "content/reports/tree-equity-score")
#' @param base_dir Base directory of the website (defaults to current working directory)
#' @return Invisible NULL. Called for side effects.
#' @examples
#' generate_report_pdfs("content/reports/tree-equity-score")
generate_report_pdfs <- function(source_dir, base_dir = getwd()) {
  # Ensure paths are absolute
  base_dir <- normalizePath(base_dir)
  full_source_dir <- file.path(base_dir, source_dir)
  
  # Create output directory if it doesn't exist
  static_dir <- file.path(base_dir, "static/reports")
  dir.create(static_dir, recursive = TRUE, showWarnings = FALSE)
  
  # Find all .Rmd files in the source directory
  rmd_files <- list.files(
    path = full_source_dir,
    pattern = "\\.Rmd$",
    full.names = TRUE
  )
  
  # Process each .Rmd file
  for (rmd_file in rmd_files) {
    # Get the parent directory name (which will be the PDF name)
    parent_dir <- basename(dirname(rmd_file))
    
    # Construct the output PDF path using the parent directory name
    pdf_path <- file.path(static_dir, paste0(parent_dir, ".pdf"))
    
    message("Rendering ", basename(rmd_file), " to ", basename(pdf_path))
    
    # Render the PDF
    tryCatch({
      rmarkdown::render(
        input = rmd_file,
        output_format = "pdf_document",
        output_file = pdf_path,
        quiet = TRUE
      )
      message("Successfully generated ", basename(pdf_path))
    }, error = function(e) {
      warning("Failed to render ", basename(rmd_file), ": ", e$message)
    })
  }
}

# Example usage:
# generate_report_pdfs("content/reports/tree-equity-score") 