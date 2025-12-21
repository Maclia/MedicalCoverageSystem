import { specs } from './src/swagger.js';

console.log('Swagger specs generated successfully!');
console.log('OpenAPI version:', specs.openapi);
console.log('Title:', specs.info.title);
console.log('Number of paths:', Object.keys(specs.paths).length);
console.log('Available paths:', Object.keys(specs.paths));