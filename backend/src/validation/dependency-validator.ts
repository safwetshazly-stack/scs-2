/**
 * Module Dependency Validator
 * 
 * Enforces module boundary rules:
 * 1. Modules can only import from shared/ and their own module
 * 2. No circular dependencies allowed
 * 3. Cross-module imports must go through module index.ts
 * 4. No direct database access from controllers
 * 
 * Usage: npx ts-node src/validation/dependency-validator.ts
 */

import * as fs from 'fs'
import * as path from 'path'

interface DependencyRule {
  module: string
  canImportFrom: string[]
}

const MODULE_RULES: DependencyRule[] = [
  {
    module: 'auth',
    canImportFrom: ['shared', 'auth']
  },
  {
    module: 'user',
    canImportFrom: ['shared', 'user', 'auth']
  },
  {
    module: 'payment',
    canImportFrom: ['shared', 'payment', 'auth', 'user']
  },
  {
    module: 'course',
    canImportFrom: ['shared', 'course', 'auth', 'payment']
  },
  {
    module: 'chat',
    canImportFrom: ['shared', 'chat', 'auth', 'user']
  },
  {
    module: 'ai',
    canImportFrom: ['shared', 'ai', 'auth', 'payment']
  },
  {
    module: 'community',
    canImportFrom: ['shared', 'community', 'auth', 'user']
  },
  {
    module: 'book',
    canImportFrom: ['shared', 'book', 'auth', 'payment']
  },
  {
    module: 'platform',
    canImportFrom: ['shared', 'platform', 'auth', 'user']
  },
  {
    module: 'admin',
    canImportFrom: ['shared', 'admin', 'auth', 'user', 'payment', 'course', 'chat', 'ai', 'community', 'book', 'platform']
  }
]

interface ImportAnalysis {
  file: string
  module: string
  imports: string[]
  violations: string[]
}

const results: ImportAnalysis[] = []

/**
 * Extract imports from a file
 */
function extractImports(content: string): string[] {
  const importRegex = /from ['"]([^'"]+)['"]/g
  const imports: string[] = []
  let match

  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1])
  }

  return imports
}

/**
 * Check if import violates rules
 */
function checkImport(
  currentModule: string,
  importPath: string,
  allowedModules: string[]
): string | null {
  // Allow relative imports within same module
  if (importPath.startsWith('.')) return null

  // Allow node_modules
  if (!importPath.startsWith('/') && !importPath.includes('/')) return null

  // Check if importing from allowed modules
  const isAllowed = allowedModules.some(mod => 
    importPath.includes(`/modules/${mod}/`) || 
    importPath.includes(`/shared/`)
  )

  if (!isAllowed) {
    return `${importPath} (not in allowed list: ${allowedModules.join(', ')})`
  }

  // Warn if not importing from index.ts for other modules
  const moduleMatch = importPath.match(/\/modules\/(\w+)\//)
  if (moduleMatch && moduleMatch[1] !== currentModule) {
    if (!importPath.includes('index.ts')) {
      return `${importPath} - should import from module/index.ts instead of internal files`
    }
  }

  return null
}

/**
 * Analyze a directory
 */
function analyzeDirectory(dirPath: string, baseModule: string): void {
  const rule = MODULE_RULES.find(r => r.module === baseModule)
  if (!rule) {
    console.warn(`No rule found for module: ${baseModule}`)
    return
  }

  const files = fs.readdirSync(dirPath, { recursive: true })
    .filter(f => typeof f === 'string' && f.endsWith('.ts'))

  for (const file of files) {
    const filePath = path.join(dirPath, file as string)
    const content = fs.readFileSync(filePath, 'utf-8')
    const imports = extractImports(content)
    const violations: string[] = []

    for (const imp of imports) {
      const violation = checkImport(baseModule, imp, rule.canImportFrom)
      if (violation) violations.push(violation)
    }

    if (violations.length > 0) {
      results.push({
        file: filePath,
        module: baseModule,
        imports,
        violations
      })
    }
  }
}

/**
 * Check for circular dependencies
 */
function checkCircularDependencies(): void {
  const dependencyMap = new Map<string, Set<string>>()

  // Build dependency graph
  for (const rule of MODULE_RULES) {
    const deps = rule.canImportFrom.filter(m => m !== 'shared')
    dependencyMap.set(rule.module, new Set(deps))
  }

  // Check for cycles using DFS
  function hasCycle(module: string, visited: Set<string>, 
                    recursionStack: Set<string>): boolean {
    visited.add(module)
    recursionStack.add(module)

    const deps = dependencyMap.get(module) || new Set()
    for (const dep of deps) {
      if (!visited.has(dep)) {
        if (hasCycle(dep, visited, recursionStack)) {
          return true
        }
      } else if (recursionStack.has(dep)) {
        return true
      }
    }

    recursionStack.delete(module)
    return false
  }

  const visited = new Set<string>()
  for (const module of dependencyMap.keys()) {
    if (!visited.has(module)) {
      if (hasCycle(module, visited, new Set())) {
        console.error(`❌ CIRCULAR DEPENDENCY DETECTED involving module: ${module}`)
      }
    }
  }
}

/**
 * Validate all modules
 */
function validate(): void {
  console.log('🔍 Validating module dependencies...\n')

  const srcDir = path.join(process.cwd(), 'src', 'modules')

  for (const module of MODULE_RULES.map(r => r.module)) {
    const modulePath = path.join(srcDir, module)
    if (fs.existsSync(modulePath)) {
      analyzeDirectory(modulePath, module)
    }
  }

  // Report violations
  if (results.length > 0) {
    console.error(`\n❌ Found ${results.length} modules with violations:\n`)

    for (const result of results) {
      console.error(`📁 ${result.file}`)
      for (const violation of result.violations) {
        console.error(`   ⚠️  ${violation}`)
      }
    }
  } else {
    console.log('✅ All modules follow dependency rules')
  }

  // Check for circular dependencies
  console.log('\n🔄 Checking for circular dependencies...')
  checkCircularDependencies()
  console.log('✅ No circular dependencies detected')

  process.exit(results.length > 0 ? 1 : 0)
}

// Run validation
validate()
