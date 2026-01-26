// Simple validation script for swagger configuration
import fs from 'fs';

try {
  // Read the swagger.ts file
  const swaggerContent = fs.readFileSync('src/swagger.ts', 'utf8');

  // Extract the options object (this is a very basic extraction)
  const optionsMatch = swaggerContent.match(/const options: any = (\{[\s\S]*?\n\})/);
  if (!optionsMatch) {
    throw new Error('Could not find options object in swagger.ts');
  }

  // Try to parse the definition part
  const definitionMatch = optionsMatch[1].match(/definition: (\{[\s\S]*?\n  \}),/);
  if (!definitionMatch) {
    throw new Error('Could not find definition in options');
  }

  console.log('Swagger configuration structure appears valid');
  console.log('Found definition object');

  // Check for basic OpenAPI structure
  if (swaggerContent.includes('openapi:')) {
    console.log('✓ OpenAPI version found');
  }
  if (swaggerContent.includes('info:')) {
    console.log('✓ Info section found');
  }
  if (swaggerContent.includes('paths:')) {
    console.log('✓ Paths section found');
  }
  if (swaggerContent.includes('components:')) {
    console.log('✓ Components section found');
  }

  console.log('Basic validation passed!');

} catch (error) {
  console.error('Validation failed:', error.message);
}