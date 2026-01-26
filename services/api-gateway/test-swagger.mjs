try {
  const { swaggerUi, specs } = await import('./src/swagger.js');
  console.log('Swagger import successful');
  console.log('Specs keys:', Object.keys(specs));
} catch (error) {
  console.error('Swagger import failed:', error.message);
}