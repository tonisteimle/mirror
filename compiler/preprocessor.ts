/**
 * Mirror Pre-Processor
 *
 * Combines project files in a fixed dependency order:
 * 1. data/      - Raw data files (.data) - parsed separately
 * 2. tokens/    - Design tokens (.mir)
 * 3. components/- Component definitions (.mir)
 * 4. layouts/   - Page layouts (.mir)
 */

export type ReadFileFn = (path: string) => string | null
export type ListFilesFn = (directory: string) => string[]

/**
 * Fixed directory order for file processing.
 * Each layer can depend on previous layers.
 */
export const DIRECTORY_ORDER = ['data', 'tokens', 'components', 'layouts'] as const

/**
 * Result of combining project files
 */
export interface ProjectFiles {
  /** Combined .mir code from all directories */
  mirrorCode: string
  /** .data files collected separately for the data parser */
  dataFiles: Array<{ name: string; source: string }>
}

/**
 * Combine all project files in the correct dependency order.
 * Separates .data files for the data parser.
 *
 * @param listFiles - Function to list files in a directory
 * @param readFile - Function to read file contents by path
 * @returns Combined code and data files
 */
export function combineProjectFilesWithData(
  listFiles: ListFilesFn,
  readFile: ReadFileFn
): ProjectFiles {
  const sections: string[] = []
  const dataFiles: Array<{ name: string; source: string }> = []

  for (const dir of DIRECTORY_ORDER) {
    const files = listFiles(dir)

    for (const file of files) {
      const content = readFile(`${dir}/${file}`)
      if (!content) continue

      // .data files go to the data parser
      if (file.endsWith('.data')) {
        dataFiles.push({ name: file, source: content })
        continue
      }

      // .mir files are combined
      sections.push(`// === ${dir}/${file} ===`)
      sections.push(content)
      sections.push('') // Empty line between files
    }
  }

  return {
    mirrorCode: sections.join('\n'),
    dataFiles,
  }
}

/**
 * Combine all project files in the correct dependency order.
 * Legacy function - does not separate .data files.
 *
 * @param listFiles - Function to list .mirror files in a directory
 * @param readFile - Function to read file contents by path
 * @returns Combined code from all files in correct order
 */
export function combineProjectFiles(listFiles: ListFilesFn, readFile: ReadFileFn): string {
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
