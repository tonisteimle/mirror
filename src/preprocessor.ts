/**
 * Mirror Pre-Processor
 *
 * Combines project files in a fixed dependency order:
 * 1. data/      - Raw data files
 * 2. tokens/    - Design tokens
 * 3. components/- Component definitions
 * 4. layouts/   - Page layouts
 */

export type ReadFileFn = (path: string) => string | null
export type ListFilesFn = (directory: string) => string[]

/**
 * Fixed directory order for file processing.
 * Each layer can depend on previous layers.
 */
export const DIRECTORY_ORDER = ['data', 'tokens', 'components', 'layouts'] as const

/**
 * Combine all project files in the correct dependency order.
 *
 * @param listFiles - Function to list .mirror files in a directory
 * @param readFile - Function to read file contents by path
 * @returns Combined code from all files in correct order
 */
export function combineProjectFiles(
  listFiles: ListFilesFn,
  readFile: ReadFileFn
): string {
  const sections: string[] = []

  for (const dir of DIRECTORY_ORDER) {
    const files = listFiles(dir)

    for (const file of files) {
      const content = readFile(`${dir}/${file}`)
      if (content) {
        // Add section comment for debugging
        sections.push(`// === ${dir}/${file} ===`)
        sections.push(content)
        sections.push('') // Empty line between files
      }
    }
  }

  return sections.join('\n')
}

/**
 * Combine files from root directory (flat structure).
 * For simple projects without subdirectories.
 *
 * @param files - List of file paths in order
 * @param readFile - Function to read file contents
 * @returns Combined code
 */
export function combineFiles(
  files: string[],
  readFile: ReadFileFn
): string {
  const sections: string[] = []

  for (const file of files) {
    const content = readFile(file)
    if (content) {
      sections.push(content)
      sections.push('') // Empty line between files
    }
  }

  return sections.join('\n')
}
