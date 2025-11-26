/**
 * Module Documentation Generator
 * Automatically generates documentation for all modules
 */

import { moduleRegistry } from '../core/registry/ModuleRegistry.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface DocumentationOptions {
  outputPath?: string;
  format?: 'markdown' | 'json' | 'html';
  includeApiDocs?: boolean;
  includeExamples?: boolean;
}

export interface ModuleDocumentation {
  name: string;
  version: string;
  description: string;
  enabled: boolean;
  dependencies: string[];
  features: Record<string, boolean>;
  routes?: Array<{
    path: string;
    method: string;
    description: string;
    parameters?: any[];
  }>;
  services?: Array<{
    name: string;
    description: string;
    methods: string[];
  }>;
  types?: Array<{
    name: string;
    description: string;
    properties?: string[];
  }>;
  healthCheck?: {
    endpoint: string;
    metrics: Record<string, any>;
  };
  examples?: Array<{
    title: string;
    description: string;
    code?: string;
    request?: any;
    response?: any;
  }>;
}

export class ModuleDocumentationGenerator {
  private options: DocumentationOptions;

  constructor(options: DocumentationOptions = {}) {
    this.options = {
      outputPath: './docs/modules',
      format: 'markdown',
      includeApiDocs: true,
      includeExamples: true,
      ...options
    };
  }

  /**
   * Generate documentation for all modules
   */
  async generateDocumentation(): Promise<void> {
    console.log('📚 Generating Module Documentation...\n');

    const modules = moduleRegistry.getAllModules();
    const documentation: ModuleDocumentation[] = [];

    // Generate documentation for each module
    for (const module of modules) {
      const doc = await this.generateModuleDocumentation(module);
      documentation.push(doc);

      console.log(`✅ Generated documentation for ${module.name}`);
    }

    // Generate system overview
    const systemOverview = await this.generateSystemOverview(documentation);

    // Write documentation files
    await this.writeDocumentationFiles(documentation, systemOverview);

    console.log(`\n🎉 Documentation generated successfully in ${this.options.outputPath}`);
  }

  /**
   * Generate documentation for a single module
   */
  private async generateModuleDocumentation(module: any): Promise<ModuleDocumentation> {
    const doc: ModuleDocumentation = {
      name: module.name,
      version: module.version,
      description: module.config.description,
      enabled: module.config.enabled,
      dependencies: module.config.dependencies || [],
      features: module.config.features || {},
    };

    // Generate API documentation if enabled
    if (this.options.includeApiDocs && module.config.routes) {
      doc.routes = await this.generateRouteDocumentation(module);
    }

    // Generate service documentation
    doc.services = await this.generateServiceDocumentation(module);

    // Generate type documentation
    doc.types = await this.generateTypeDocumentation(module);

    // Generate health check documentation
    if (module.config.routes) {
      doc.healthCheck = {
        endpoint: `${module.config.routes.prefix}/health`,
        metrics: await this.generateMetricsDocumentation(module)
      };
    }

    // Generate examples if enabled
    if (this.options.includeExamples) {
      doc.examples = await this.generateExamples(module);
    }

    return doc;
  }

  /**
   * Generate route documentation
   */
  private async generateRouteDocumentation(module: any): Promise<any[]> {
    // This would analyze the module's routes
    // For now, return a placeholder
    return [
      {
        path: `${module.config.routes.prefix}/health`,
        method: 'GET',
        description: 'Module health check endpoint'
      },
      {
        path: `${module.config.routes.prefix}/info`,
        method: 'GET',
        description: 'Module information endpoint'
      },
      {
        path: `${module.config.routes.prefix}/metrics`,
        method: 'GET',
        description: 'Module metrics endpoint'
      }
    ];
  }

  /**
   * Generate service documentation
   */
  private async generateServiceDocumentation(module: any): Promise<any[]> {
    // This would analyze the module's services
    // For now, return a placeholder
    return [
      {
        name: `${module.name}Service`,
        description: `Main service for ${module.name} module`,
        methods: ['initialize', 'activate', 'deactivate', 'healthCheck']
      }
    ];
  }

  /**
   * Generate type documentation
   */
  private async generateTypeDocumentation(module: any): Promise<any[]> {
    // This would analyze the module's types
    // For now, return a placeholder
    return [
      {
        name: `${module.name}Config`,
        description: `Configuration type for ${module.name} module`,
        properties: ['name', 'version', 'description', 'enabled', 'dependencies']
      }
    ];
  }

  /**
   * Generate metrics documentation
   */
  private async generateMetricsDocumentation(module: any): Promise<Record<string, any>> {
    try {
      const metrics = await module.getMetrics();
      return {
        uptime: metrics.uptime,
        requestCount: metrics.requestCount,
        errorCount: metrics.errorCount,
        responseTime: metrics.responseTime,
        memoryUsage: metrics.memoryUsage
      };
    } catch (error) {
      return {};
    }
  }

  /**
   * Generate usage examples
   */
  private async generateExamples(module: any): Promise<any[]> {
    const examples: any[] = [];

    // Health check example
    if (module.config.routes) {
      examples.push({
        title: 'Module Health Check',
        description: `Check the health status of the ${module.name} module`,
        request: {
          method: 'GET',
          url: `${module.config.routes.prefix}/health`
        },
        response: {
          status: 'healthy',
          services: {},
          dependencies: {},
          lastCheck: new Date().toISOString(),
          errors: []
        }
      });
    }

    // Module info example
    examples.push({
      title: 'Module Information',
      description: `Get information about the ${module.name} module`,
      request: {
        method: 'GET',
        url: `${module.config.routes?.prefix || '/api'}/info`
      },
      response: {
        name: module.name,
        version: module.version,
        description: module.config.description,
        features: module.config.features,
        status: {
          enabled: module.config.enabled,
          active: true,
          initialized: true
        }
      }
    });

    return examples;
  }

  /**
   * Generate system overview documentation
   */
  private async generateSystemOverview(modules: ModuleDocumentation[]): Promise<any> {
    const overview = moduleRegistry.getSystemOverview();

    return {
      title: 'Medical Coverage System - Module Overview',
      generatedAt: new Date().toISOString(),
      summary: {
        totalModules: overview.totalModules,
        enabledModules: overview.enabledModules,
        activeModules: overview.activeModules,
        loadOrder: overview.loadOrder
      },
      modules: modules.map(m => ({
        name: m.name,
        version: m.version,
        description: m.description,
        enabled: m.enabled,
        dependencies: m.dependencies,
        features: m.features,
        healthEndpoint: m.healthCheck?.endpoint
      })),
      architecture: {
        pattern: 'Modular Architecture',
        registry: 'Module Registry',
        lifecycle: ['register', 'initialize', 'activate', 'deactivate', 'cleanup'],
        healthMonitoring: true,
        configuration: true
      }
    };
  }

  /**
   * Write documentation files
   */
  private async writeDocumentationFiles(modules: ModuleDocumentation[], systemOverview: any): Promise<void> {
    const outputPath = this.options.outputPath || './docs/modules';

    // Ensure output directory exists
    await fs.mkdir(outputPath, { recursive: true });

    if (this.options.format === 'markdown') {
      await this.writeMarkdownFiles(modules, systemOverview, outputPath);
    } else if (this.options.format === 'json') {
      await this.writeJsonFiles(modules, systemOverview, outputPath);
    } else if (this.options.format === 'html') {
      await this.writeHtmlFiles(modules, systemOverview, outputPath);
    }
  }

  /**
   * Write markdown documentation files
   */
  private async writeMarkdownFiles(modules: ModuleDocumentation[], systemOverview: any, outputPath: string): Promise<void> {
    // Write system overview
    await this.writeMarkdownOverview(systemOverview, outputPath);

    // Write individual module documentation
    for (const module of modules) {
      const markdown = this.generateModuleMarkdown(module);
      const fileName = `${module.name.toLowerCase()}.md`;
      await fs.writeFile(path.join(outputPath, fileName), markdown);
    }

    // Write index file
    await this.writeMarkdownIndex(modules, outputPath);
  }

  /**
   * Generate markdown for a module
   */
  private generateModuleMarkdown(module: ModuleDocumentation): string {
    let markdown = `# ${module.name}

> Version: ${module.version} | Status: ${module.enabled ? 'Enabled' : 'Disabled'}

## Description

${module.description}

## Configuration

${module.enabled ? '✅ **Enabled**' : '❌ **Disabled**'}

### Dependencies

${module.dependencies.length > 0 ? module.dependencies.map(dep => `- ${dep}`).join('\n') : 'None'}

### Features

${Object.entries(module.features).map(([feature, enabled]) =>
  `- ${enabled ? '✅' : '❌'} ${feature}`
).join('\n')}`;

    if (module.routes && module.routes.length > 0) {
      markdown += `

## API Routes

| Method | Path | Description |
|--------|------|-------------|
${module.routes.map(route =>
  `| ${route.method} | \`${route.path}\` | ${route.description} |`
).join('\n')}`;
    }

    if (module.services && module.services.length > 0) {
      markdown += `

## Services

${module.services.map(service => `
### ${service.name}

${service.description}

**Methods:** ${service.methods.join(', ')}
`).join('\n')}`;
    }

    if (module.healthCheck) {
      markdown += `

## Health Check

- **Endpoint:** \`${module.healthCheck.endpoint}\`
- **Metrics:** Available

### Example Request

\`\`\`bash
curl ${module.healthCheck.endpoint}
\`\`\`

### Example Response

\`\`\`json
{
  "status": "healthy",
  "services": {},
  "dependencies": {},
  "lastCheck": "${new Date().toISOString()}",
  "errors": []
}
\`\`\``;
    }

    if (module.examples && module.examples.length > 0) {
      markdown += `

## Usage Examples

${module.examples.map(example => `
### ${example.title}

${example.description}

\`\`\`bash
${example.request.method} ${example.request.url}
\`\`\`

\`\`\`json
${JSON.stringify(example.response, null, 2)}
\`\`\`
`).join('\n')}`;
    }

    markdown += `

---

*Generated on ${new Date().toISOString()}*`;

    return markdown;
  }

  /**
   * Write markdown overview
   */
  private async writeMarkdownOverview(systemOverview: any, outputPath: string): Promise<void> {
    const markdown = `# Medical Coverage System - Module Overview

> Generated on ${systemOverview.generatedAt}

## System Summary

- **Total Modules:** ${systemOverview.summary.totalModules}
- **Enabled Modules:** ${systemOverview.summary.enabledModules}
- **Active Modules:** ${systemOverview.summary.activeModules}

## Load Order

${systemOverview.summary.loadOrder.map((name: string, index: number) =>
  `${index + 1}. ${name}`
).join('\n')}

## Architecture

- **Pattern:** ${systemOverview.architecture.pattern}
- **Registry:** ${systemOverview.architecture.registry}
- **Health Monitoring:** ${systemOverview.architecture.healthMonitoring ? 'Yes' : 'No'}
- **Configuration:** ${systemOverview.architecture.configuration ? 'Yes' : 'No'}

## Modules

${systemOverview.modules.map((m: any) => `
### ${m.name}

- **Version:** ${m.version}
- **Status:** ${m.enabled ? 'Enabled' : 'Disabled'}
- **Dependencies:** ${m.dependencies.length > 0 ? m.dependencies.join(', ') : 'None'}
- **Health Endpoint:** \`${m.healthEndpoint || 'N/A'}\`

${m.description}
`).join('\n')}
`;

    await fs.writeFile(path.join(outputPath, 'overview.md'), markdown);
  }

  /**
   * Write markdown index
   */
  private async writeMarkdownIndex(modules: ModuleDocumentation[], outputPath: string): Promise<void> {
    const markdown = `# Medical Coverage System - Module Documentation

## Overview

This directory contains documentation for all modules in the Medical Coverage System.

## Available Modules

${modules.map(module => `- [${module.name}](./${module.name.toLowerCase()}.md) - ${module.description}`).join('\n')}

## System Overview

- [System Overview](./overview.md) - Complete system architecture and configuration

## API Documentation

For complete API documentation, see the [API Docs](../api/) section.

---

*Generated automatically by ModuleDocumentationGenerator*
`;

    await fs.writeFile(path.join(outputPath, 'README.md'), markdown);
  }

  /**
   * Write JSON documentation files
   */
  private async writeJsonFiles(modules: ModuleDocumentation[], systemOverview: any, outputPath: string): Promise<void> {
    // Write system overview
    await fs.writeFile(
      path.join(outputPath, 'overview.json'),
      JSON.stringify(systemOverview, null, 2)
    );

    // Write individual module documentation
    for (const module of modules) {
      const fileName = `${module.name.toLowerCase()}.json`;
      await fs.writeFile(
        path.join(outputPath, fileName),
        JSON.stringify(module, null, 2)
      );
    }
  }

  /**
   * Write HTML documentation files
   */
  private async writeHtmlFiles(modules: ModuleDocumentation[], systemOverview: any, outputPath: string): Promise<void> {
    // Generate HTML documentation (placeholder for now)
    console.log('HTML documentation generation not yet implemented');
  }
}

// Convenience function to generate documentation
export async function generateModuleDocumentation(options?: DocumentationOptions): Promise<void> {
  const generator = new ModuleDocumentationGenerator(options);
  await generator.generateDocumentation();
}

export default ModuleDocumentationGenerator;