/**
 * AI-powered Demo Data Generation
 *
 * Uses LLM to generate realistic demo data based on schemas.
 * Outputs data in Mirror instance syntax for the Data tab.
 */

import type { DataSchema, DataRecord } from '../parser/types'
import { parseDataCode, getCollectionName, generateInstancesSyntax } from '../parser/data-parser'
import { API, STORAGE_KEYS } from '../constants'

/**
 * System prompt for Mirror syntax data generation
 */
const DATA_GENERATION_PROMPT = `Du bist ein Daten-Generator für UI-Prototypen.
Generiere realistische Demo-Daten basierend auf den gegebenen Schemas.

WICHTIG:
- Antworte NUR mit Mirror-Instanz-Syntax, keine JSON oder Erklärungen
- Generiere 3-5 Einträge pro Typ
- Format pro Zeile: - TypeName "wert1", wert2, wert3 (Kommas zwischen Werten!)
- Strings in Anführungszeichen, Numbers und Booleans ohne
- Booleans: true oder false (lowercase)
- Relationen: TypeName[index] z.B. Category[0]
- WICHTIG: Typen mit Relationen MÜSSEN nach den referenzierten Typen kommen!
- Verwende realistische, deutschsprachige Inhalte wo sinnvoll

Beispiel für Schema:
Category:
  name: text
Task:
  title: text
  done: boolean
  category: Category

Output:
- Category "Arbeit"
- Category "Privat"
- Category "Sport"

- Task "Einkaufen", false, Category[0]
- Task "Bericht schreiben", true, Category[0]
- Task "Joggen", false, Category[2]`

/**
 * Result of generating data with AI
 */
interface DataGenerationResult {
  success: boolean
  code?: string  // Mirror instance syntax to append
  error?: string
}

/**
 * Generate data instances using LLM based on schemas in the data code.
 * Returns Mirror instance syntax that can be appended to the data code.
 */
export async function generateDataWithAI(dataCode: string): Promise<DataGenerationResult> {
  // Parse current code to get schemas
  const { schemas, errors } = parseDataCode(dataCode)

  if (schemas.length === 0) {
    return { success: false, error: 'Keine Schemas gefunden. Definiere erst Schemas mit TypeName: und Feldern.' }
  }

  // Get API key from localStorage
  let apiKey: string
  try {
    apiKey = localStorage.getItem(STORAGE_KEYS.API_KEY) || ''
  } catch {
    return { success: false, error: 'Kein Zugriff auf API Key' }
  }

  if (!apiKey) {
    // Fall back to placeholder generation without LLM
    const placeholderCode = generateInstancesSyntax(schemas, 3)
    return { success: true, code: placeholderCode }
  }

  // Build schema description for the prompt
  const schemaText = schemas.map(s => {
    const fields = s.fields.map(f => `  ${f.name}: ${f.type}`).join('\n')
    return `${s.typeName}:\n${fields}`
  }).join('\n\n')

  const userPrompt = `Schemas:
${schemaText}

Generiere Mirror-Instanz-Syntax für diese Typen.
Beachte: Typen mit Relationen nach den referenzierten Typen!`

  try {
    const response = await fetch(API.ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Mirror Data Generator',
      },
      body: JSON.stringify({
        model: API.MODEL,
        messages: [
          { role: 'system', content: DATA_GENERATION_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 2048,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      return { success: false, error: `API Error: ${response.status}${errorText ? ` - ${errorText}` : ''}` }
    }

    const responseData = await response.json() as { choices: Array<{ message?: { content?: string } }> }
    let content = responseData.choices[0]?.message?.content || ''

    // Clean up potential markdown code blocks
    content = content.replace(/```(?:mirror)?\s*/gi, '').replace(/```\s*/g, '')
    content = content.trim()

    // Validate that content looks like Mirror instance syntax
    if (!content.includes('- ')) {
      return { success: false, error: 'LLM hat keine gültige Mirror-Syntax generiert' }
    }

    return { success: true, code: content }

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler'
    return { success: false, error: message }
  }
}

// ============================================
// Legacy functions (for backwards compatibility)
// ============================================

interface GenerationResult {
  success: boolean
  data?: Map<string, DataRecord[]>
  error?: string
}

/**
 * Generate demo data using LLM based on schemas.
 * @deprecated Use generateDataWithAI instead
 */
export async function generateDemoData(schemas: DataSchema[]): Promise<GenerationResult> {
  // Get API key from localStorage
  let apiKey: string
  try {
    apiKey = localStorage.getItem(STORAGE_KEYS.API_KEY) || ''
  } catch {
    return { success: false, error: 'Kein Zugriff auf API Key' }
  }

  if (!apiKey) {
    return { success: false, error: 'Kein API Key gesetzt. Bitte OpenRouter API Key in den Einstellungen eingeben.' }
  }

  // Build schema description for the prompt
  const schemaText = schemas.map(s => {
    const fields = s.fields.map(f => `  ${f.name}: ${f.type}`).join('\n')
    return `${s.typeName}\n${fields}`
  }).join('\n\n')

  // Build the expected output format hint
  const outputHint = schemas.map(s => getCollectionName(s.typeName)).join(', ')

  const userPrompt = `Schemas:
${schemaText}

Generiere JSON mit diesen Collections: ${outputHint}
Beachte Relations zwischen den Typen.`

  const JSON_PROMPT = `Du bist ein Daten-Generator für UI-Prototypen.
Generiere realistische Demo-Daten basierend auf den gegebenen Schemas.

WICHTIG:
- Antworte NUR mit validem JSON, keine Erklärungen oder Markdown
- Generiere 3-5 Einträge pro Typ
- Bei Relations: Verwende existierende _id Werte aus den referenzierten Typen
- Verwende realistische, deutschsprachige Inhalte wo sinnvoll
- Jeder Eintrag braucht eine _id im Format "typename-1", "typename-2", etc.

Beispiel-Output für Tasks + Categories:
{"tasks":[{"_id":"task-1","title":"Einkaufen","done":false,"category":"cat-1"}],"categories":[{"_id":"cat-1","name":"Privat"}]}`

  try {
    const response = await fetch(API.ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Mirror Data Generator',
      },
      body: JSON.stringify({
        model: API.MODEL,
        messages: [
          { role: 'system', content: JSON_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 2048,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      return { success: false, error: `API Error: ${response.status}${errorText ? ` - ${errorText}` : ''}` }
    }

    const responseData = await response.json() as { choices: Array<{ message?: { content?: string } }> }
    let content = responseData.choices[0]?.message?.content || ''

    // Clean up potential markdown code blocks
    content = content.replace(/```(?:json)?\s*/gi, '').replace(/```\s*/g, '')
    content = content.trim()

    // Parse JSON
    let parsedData: Record<string, unknown[]>
    try {
      parsedData = JSON.parse(content) as Record<string, unknown[]>
    } catch {
      return { success: false, error: `Ungültiges JSON vom LLM: ${content.slice(0, 100)}...` }
    }

    // Convert to Map<string, DataRecord[]>
    const result = new Map<string, DataRecord[]>()

    for (const schema of schemas) {
      const collectionName = getCollectionName(schema.typeName)
      const records = parsedData[collectionName]

      if (Array.isArray(records)) {
        // Ensure all records have _id
        const validRecords = records.map((record: unknown) => {
          const rec = record as Record<string, unknown>
          if (!rec._id) {
            rec._id = `${schema.typeName.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
          }
          return rec as DataRecord
        })
        result.set(collectionName, validRecords)
      } else {
        // No data for this type, create empty array
        result.set(collectionName, [])
      }
    }

    return { success: true, data: result }

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler'
    return { success: false, error: message }
  }
}

/**
 * Generate simple placeholder data without LLM (fallback).
 */
export function generatePlaceholderData(schemas: DataSchema[]): Map<string, DataRecord[]> {
  const result = new Map<string, DataRecord[]>()

  // First pass: create records for each type
  for (const schema of schemas) {
    const collectionName = getCollectionName(schema.typeName)
    const records: DataRecord[] = []

    // Generate 3 placeholder records
    for (let i = 1; i <= 3; i++) {
      const record: DataRecord = {
        _id: `${schema.typeName.toLowerCase()}-${i}`
      }

      for (const field of schema.fields) {
        switch (field.type) {
          case 'text':
            record[field.name] = `${field.name} ${i}`
            break
          case 'number':
            record[field.name] = i * 10
            break
          case 'boolean':
            record[field.name] = i % 2 === 0
            break
          default:
            // Relation - will be filled in second pass
            record[field.name] = ''
            break
        }
      }

      records.push(record)
    }

    result.set(collectionName, records)
  }

  // Second pass: fill in relations
  for (const schema of schemas) {
    const collectionName = getCollectionName(schema.typeName)
    const records = result.get(collectionName) || []

    for (const record of records) {
      for (const field of schema.fields) {
        // Check if this is a relation (type is another schema name)
        const relatedSchema = schemas.find(s => s.typeName === field.type)
        if (relatedSchema) {
          const relatedCollectionName = getCollectionName(relatedSchema.typeName)
          const relatedRecords = result.get(relatedCollectionName) || []
          if (relatedRecords.length > 0) {
            // Assign a random related record's ID
            const randomIndex = Math.floor(Math.random() * relatedRecords.length)
            record[field.name] = relatedRecords[randomIndex]._id
          }
        }
      }
    }
  }

  return result
}

/**
 * Convert DataRecords map to variables object for the generator.
 * $tasks, $categories, etc.
 */
export function dataRecordsToVariables(
  dataRecords: Map<string, DataRecord[]>
): Record<string, DataRecord[]> {
  const variables: Record<string, DataRecord[]> = {}

  for (const [collectionName, records] of dataRecords) {
    variables[collectionName] = records
  }

  return variables
}
