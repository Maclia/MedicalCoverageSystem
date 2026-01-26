const crypto = require('crypto');
const os = require('os');

/**
 * Diff Generator Utility
 * Generate and display differences between text content with various output formats
 */

class DiffGenerator {
  constructor(options = {}) {
    this.contextLines = options.contextLines || 3;
    this.showLineNumbers = options.showLineNumbers !== false;
    this.colorOutput = options.colorOutput !== false;
    this.format = options.format || 'unified'; // unified, context, html, json
    this.wordDiff = options.wordDiff || false;
    this.ignoreWhitespace = options.ignoreWhitespace || false;
    this.ignoreCase = options.ignoreCase || false;
    this.maxDifferences = options.maxDifferences || 1000;
  }

  /**
   * Generate diff between two strings
   */
  generateDiff(original, modified, options = {}) {
    const config = {
      contextLines: options.contextLines || this.contextLines,
      showLineNumbers: options.showLineNumbers !== undefined ? options.showLineNumbers : this.showLineNumbers,
      colorOutput: options.colorOutput !== undefined ? options.colorOutput : this.colorOutput,
      format: options.format || this.format,
      wordDiff: options.wordDiff !== undefined ? options.wordDiff : this.wordDiff,
      ignoreWhitespace: options.ignoreWhitespace !== undefined ? options.ignoreWhitespace : this.ignoreWhitespace,
      ignoreCase: options.ignoreCase !== undefined ? options.ignoreCase : this.ignoreCase,
      originalLabel: options.originalLabel || 'original',
      modifiedLabel: options.modifiedLabel || 'modified',
      originalPath: options.originalPath || '/dev/stdin',
      modifiedPath: options.modifiedPath || '/dev/stdin',
      timestamp: options.timestamp || new Date().toISOString()
    };

    // Convert to lines for processing
    const originalLines = this.splitLines(original);
    const modifiedLines = this.splitLines(modified);

    // Apply transformations
    const processedOriginal = this.processLines(originalLines, config);
    const processedModified = this.processLines(modifiedLines, config);

    // Generate hunks
    const hunks = this.findHunks(processedOriginal, processedModified, config);

    // Calculate statistics
    const stats = this.calculateStats(originalLines, modifiedLines, hunks);

    const result = {
      original: {
        content: original,
        lines: originalLines,
        checksum: this.calculateChecksum(original)
      },
      modified: {
        content: modified,
        lines: modifiedLines,
        checksum: this.calculateChecksum(modified)
      },
      hunks,
      stats,
      config,
      identical: hunks.length === 0,
      generated: config.timestamp
    };

    return result;
  }

  /**
   * Split content into lines
   */
  splitLines(content) {
    if (typeof content !== 'string') {
      return [];
    }
    return content.split(/\r?\n/);
  }

  /**
   * Process lines according to configuration
   */
  processLines(lines, config) {
    return lines.map((line, index) => ({
      content: line,
      index,
      processed: this.processLine(line, config)
    }));
  }

  /**
   * Process a single line
   */
  processLine(line, config) {
    let processed = line;

    if (config.ignoreWhitespace) {
      processed = processed.trim();
    }

    if (config.ignoreCase) {
      processed = processed.toLowerCase();
    }

    return processed;
  }

  /**
   * Find differences between line arrays
   */
  findHunks(original, modified, config) {
    const hunks = [];
    let i = 0;
    let j = 0;

    while (i < original.length || j < modified.length) {
      const hunk = this.findNextHunk(original, modified, i, j, config);
      if (hunk) {
        hunks.push(hunk);
        i = hunk.originalEnd + 1;
        j = hunk.modifiedEnd + 1;
      } else {
        break;
      }
    }

    return hunks;
  }

  /**
   * Find the next hunk of differences
   */
  findNextHunk(original, modified, startOriginal, startModified, config) {
    const maxLength = Math.max(
      original.length - startOriginal,
      modified.length - startModified
    );

    // Find start of difference
    let diffStart = this.findDiffStart(
      original,
      modified,
      startOriginal,
      startModified
    );

    if (diffStart.originalIndex >= original.length &&
        diffStart.modifiedIndex >= modified.length) {
      return null;
    }

    // Find end of difference
    const diffEnd = this.findDiffEnd(
      original,
      modified,
      diffStart.originalIndex,
      diffStart.modifiedIndex
    );

    // Calculate context lines
    const contextStart = Math.max(0, diffStart.originalIndex - config.contextLines);
    const contextEnd = Math.min(
      original.length - 1,
      diffEnd.originalIndex + config.contextLines
    );

    const modifiedContextStart = Math.max(0, diffStart.modifiedIndex - config.contextLines);
    const modifiedContextEnd = Math.min(
      modified.length - 1,
      diffEnd.modifiedIndex + config.contextLines
    );

    // Extract context lines
    const originalContext = original.slice(contextStart, diffStart.originalIndex);
    const modifiedContext = modified.slice(modifiedContextStart, diffStart.modifiedIndex);

    // Extract changed lines
    const originalChanges = original.slice(diffStart.originalIndex, diffEnd.originalIndex + 1);
    const modifiedChanges = modified.slice(diffStart.modifiedIndex, diffEnd.modifiedIndex + 1);

    // Extract trailing context
    const originalTrailing = original.slice(diffEnd.originalIndex + 1, contextEnd + 1);
    const modifiedTrailing = modified.slice(diffEnd.modifiedIndex + 1, modifiedContextEnd + 1);

    return {
      contextStart,
      originalStart: diffStart.originalIndex,
      originalEnd: diffEnd.originalIndex,
      modifiedStart: diffStart.modifiedIndex,
      modifiedEnd: diffEnd.modifiedIndex,
      originalContext,
      modifiedContext,
      originalChanges,
      modifiedChanges,
      originalTrailing,
      modifiedTrailing,
      type: this.classifyHunk(originalChanges, modifiedChanges),
      score: this.calculateHunkScore(originalChanges, modifiedChanges)
    };
  }

  /**
   * Find start of difference
   */
  findDiffStart(original, modified, startOriginal, startModified) {
    let i = startOriginal;
    let j = startModified;

    while (
      i < original.length &&
      j < modified.length &&
      original[i].processed === modified[j].processed
    ) {
      i++;
      j++;
    }

    return { originalIndex: i, modifiedIndex: j };
  }

  /**
   * Find end of difference
   */
  findDiffEnd(original, modified, startOriginal, startModified) {
    let i = startOriginal;
    let j = startModified;
    let originalSync = -1;
    let modifiedSync = -1;

    // Look for synchronization point
    while (i < original.length || j < modified.length) {
      if (i < original.length && j < modified.length) {
        // Look ahead for matching lines
        const sync = this.findSyncPoint(original, modified, i, j);
        if (sync.found) {
          originalSync = sync.originalIndex;
          modifiedSync = sync.modifiedIndex;
          break;
        }
      }

      if (i < original.length) i++;
      if (j < modified.length) j++;

      // Prevent infinite loops
      if ((i - startOriginal) > 100 || (j - startModified) > 100) {
        break;
      }
    }

    return {
      originalIndex: originalSync >= 0 ? originalSync : original.length - 1,
      modifiedIndex: modifiedSync >= 0 ? modifiedSync : modified.length - 1
    };
  }

  /**
   * Find synchronization point between line arrays
   */
  findSyncPoint(original, modified, startOriginal, startModified) {
    const lookAhead = Math.min(10, original.length - startOriginal, modified.length - startModified);

    for (let ahead = 0; ahead < lookAhead; ahead++) {
      const originalLine = original[startOriginal + ahead];
      const modifiedLine = modified[startModified + ahead];

      if (originalLine && modifiedLine && originalLine.processed === modifiedLine.processed) {
        return {
          found: true,
          originalIndex: startOriginal + ahead,
          modifiedIndex: startModified + ahead
        };
      }
    }

    return { found: false };
  }

  /**
   * Classify hunk type
   */
  classifyHunk(originalChanges, modifiedChanges) {
    if (originalChanges.length === 0) {
      return 'addition';
    } else if (modifiedChanges.length === 0) {
      return 'deletion';
    } else if (originalChanges.length === 1 && modifiedChanges.length === 1) {
      return 'modification';
    } else if (originalChanges.length === 1 && modifiedChanges.length > 1) {
      return 'replacement';
    } else if (originalChanges.length > 1 && modifiedChanges.length === 1) {
      return 'replacement';
    } else {
      return 'complex';
    }
  }

  /**
   * Calculate hunk score for sorting
   */
  calculateHunkScore(originalChanges, modifiedChanges) {
    const totalChanges = originalChanges.length + modifiedChanges.length;
    const lineChanges = Math.abs(originalChanges.length - modifiedChanges.length);

    // Simple scoring: more lines changed = higher score
    return totalChanges * 10 + lineChanges;
  }

  /**
   * Calculate diff statistics
   */
  calculateStats(originalLines, modifiedLines, hunks) {
    let additions = 0;
    let deletions = 0;
    let modifications = 0;

    for (const hunk of hunks) {
      if (hunk.type === 'addition') {
        additions += hunk.modifiedChanges.length;
      } else if (hunk.type === 'deletion') {
        deletions += hunk.originalChanges.length;
      } else if (hunk.type === 'modification') {
        additions += hunk.modifiedChanges.length;
        deletions += hunk.originalChanges.length;
        modifications += Math.min(hunk.originalChanges.length, hunk.modifiedChanges.length);
      } else {
        additions += hunk.modifiedChanges.length;
        deletions += hunk.originalChanges.length;
        modifications += Math.min(hunk.originalChanges.length, hunk.modifiedChanges.length);
      }
    }

    const totalLines = Math.max(originalLines.length, modifiedLines.length);
    const changedLines = additions + deletions;
    const similarity = totalLines > 0 ? ((totalLines - changedLines) / totalLines) * 100 : 100;

    return {
      originalLines: originalLines.length,
      modifiedLines: modifiedLines.length,
      additions,
      deletions,
      modifications,
      changes: changedLines,
      similarity: Math.round(similarity * 100) / 100,
      hunks: hunks.length
    };
  }

  /**
   * Generate unified format output
   */
  generateUnifiedFormat(diff) {
    const lines = [];
    const config = diff.config;

    // Header
    lines.push(`--- ${config.originalPath}`);
    lines.push(`+++ ${config.modifiedPath}`);

    if (diff.hunks.length > 0) {
      for (const hunk of diff.hunks) {
        lines.push(this.formatHunkHeader(hunk));
        lines.push(...this.formatHunkLines(hunk, config));
      }
    } else {
      lines.push('No differences found');
    }

    return lines.join('\n');
  }

  /**
   * Generate context format output
   */
  generateContextFormat(diff) {
    const lines = [];
    const config = diff.config;

    // Header
    lines.push(`*** ${config.originalPath}`);
    lines.push(`--- ${config.modifiedPath}`);

    if (diff.hunks.length > 0) {
      for (const hunk of diff.hunks) {
        lines.push(...this.formatHunkContext(hunk, config));
      }
    } else {
      lines.push('No differences found');
    }

    return lines.join('\n');
  }

  /**
   * Generate HTML format output
   */
  generateHtmlFormat(diff) {
    const lines = [];

    lines.push('<!DOCTYPE html>');
    lines.push('<html>');
    lines.push('<head>');
    lines.push('<title>Diff Viewer</title>');
    lines.push('<style>');
    lines.push(`
      body { font-family: monospace; margin: 20px; }
      .diff { border: 1px solid #ccc; }
      .hunk { border-left: 3px solid #ccc; }
      .context { color: #666; }
      .addition { background-color: #e6ffed; }
      .deletion { background-color: #ffe6e6; }
      .modification { background-color: #fff3cd; }
      .line-number { display: inline-block; width: 80px; text-align: right; margin-right: 20px; color: #666; }
      .hunk-header { background-color: #f8f9fa; padding: 5px; font-weight: bold; }
      table { width: 100%; border-collapse: collapse; }
      td, th { padding: 2px 5px; vertical-align: top; }
      .original { border-right: 1px solid #ddd; }
      .marker { width: 20px; text-align: center; }
    `);
    lines.push('</style>');
    lines.push('</head>');
    lines.push('<body>');
    lines.push('<div class="diff">');

    if (diff.hunks.length > 0) {
      for (const hunk of diff.hunks) {
        lines.push(...this.formatHunkHtml(hunk, diff.config));
      }
    } else {
      lines.push('<div class="hunk-header">No differences found</div>');
    }

    lines.push('</div>');
    lines.push('</body>');
    lines.push('</html>');

    return lines.join('\n');
  }

  /**
   * Generate JSON format output
   */
  generateJsonFormat(diff) {
    const output = {
      metadata: {
        original: {
          path: diff.config.originalPath,
          lines: diff.original.lines.length,
          checksum: diff.original.checksum
        },
        modified: {
          path: diff.config.modifiedPath,
          lines: diff.modified.lines.length,
          checksum: diff.modified.checksum
        },
        generated: diff.generated,
        identical: diff.identical,
        format: diff.config.format
      },
      stats: diff.stats,
      hunks: diff.hunks.map(hunk => ({
        type: hunk.type,
        score: hunk.score,
        contextStart: hunk.contextStart,
        originalStart: hunk.originalStart,
        originalEnd: hunk.originalEnd,
        modifiedStart: hunk.modifiedStart,
        modifiedEnd: hunk.modifiedEnd,
        originalContext: hunk.originalContext.map(l => l.content),
        modifiedContext: hunk.modifiedContext.map(l => l.content),
        originalChanges: hunk.originalChanges.map(l => l.content),
        modifiedChanges: hunk.modifiedChanges.map(l => l.content),
        originalTrailing: hunk.originalTrailing.map(l => l.content),
        modifiedTrailing: hunk.modifiedTrailing.map(l => l.content)
      }))
    };

    return JSON.stringify(output, null, 2);
  }

  /**
   * Format hunk header for unified format
   */
  formatHunkHeader(hunk) {
    const originalCount = hunk.originalEnd - hunk.originalStart + 1;
    const modifiedCount = hunk.modifiedEnd - hunk.modifiedStart + 1;
    const startLine = hunk.originalContext.length > 0 ? hunk.contextStart + 1 : 1;

    return `@@ -${startLine},${originalCount} +${startLine},${modifiedCount} @@`;
  }

  /**
   * Format hunk lines for unified format
   */
  formatHunkLines(hunk, config) {
    const lines = [];

    // Original context
    for (const line of hunk.originalContext) {
      lines.push(this.formatLine(' ', line.content, config));
    }

    // Deletions
    for (const line of hunk.originalChanges) {
      lines.push(this.formatLine('-', line.content, config));
    }

    // Additions
    for (const line of hunk.modifiedChanges) {
      lines.push(this.formatLine('+', line.content, config));
    }

    // Trailing context
    for (const line of hunk.originalTrailing) {
      lines.push(this.formatLine(' ', line.content, config));
    }

    return lines;
  }

  /**
   * Format a single line with prefix
   */
  formatLine(prefix, content, config) {
    let line = prefix + content;

    if (config.showLineNumbers && prefix !== ' ') {
      // Add line number information (simplified for unified format)
      line = line;
    }

    if (config.colorOutput) {
      line = this.colorizeLine(line, prefix);
    }

    return line;
  }

  /**
   * Colorize line based on prefix
   */
  colorizeLine(line, prefix) {
    if (!process.stdout.isTTY && !config.forceColor) {
      return line;
    }

    const colors = {
      '+': '\x1b[92m', // green
      '-': '\x1b[91m', // red
      '@': '\x1b[96m', // cyan
      ' ': '\x1b[0m',  // reset
    };

    const reset = '\x1b[0m';
    const color = colors[prefix] || '';

    return color + line + reset;
  }

  /**
   * Format hunk for context format
   */
  formatHunkContext(hunk, config) {
    const lines = [];

    // Context header
    lines.push('***************');

    // Original context
    lines.push(`*** ${hunk.contextStart + 1},${hunk.originalEnd + 1} ****`);
    for (const line of hunk.originalContext) {
      lines.push(' ' + line.content);
    }
    for (const line of hunk.originalChanges) {
      lines.push('- ' + line.content);
    }
    for (const line of hunk.originalTrailing) {
      lines.push(' ' + line.content);
    }

    // Modified context
    lines.push(`--- ${hunk.contextStart + 1},${hunk.modifiedEnd + 1} ----`);
    for (const line of hunk.modifiedContext) {
      lines.push(' ' + line.content);
    }
    for (const line of hunk.modifiedChanges) {
      lines.push('+ ' + line.content);
    }
    for (const line of hunk.modifiedTrailing) {
      lines.push(' ' + line.content);
    }

    return lines;
  }

  /**
   * Format hunk for HTML format
   */
  formatHunkHtml(hunk, config) {
    const lines = [];
    let originalLineNumber = hunk.contextStart + 1;
    let modifiedLineNumber = hunk.contextStart + 1;

    lines.push('<div class="hunk">');
    lines.push('<div class="hunk-header">' + this.formatHunkHeader(hunk) + '</div>');
    lines.push('<table>');

    // Context lines
    for (let i = 0; i < hunk.originalContext.length; i++) {
      const line = hunk.originalContext[i].content;
      lines.push(`
        <tr>
          <td class="original">${originalLineNumber + i}</td>
          <td class="modified">${modifiedLineNumber + i}</td>
          <td class="marker"> </td>
          <td class="context">${this.escapeHtml(line)}</td>
        </tr>
      `);
    }

    originalLineNumber += hunk.originalContext.length;
    modifiedLineNumber += hunk.modifiedContext.length;

    // Deletions
    for (const line of hunk.originalChanges) {
      const content = this.escapeHtml(line.content);
      lines.push(`
        <tr>
          <td class="original">${originalLineNumber++}</td>
          <td class="modified"></td>
          <td class="marker">-</td>
          <td class="deletion">${content}</td>
        </tr>
      `);
    }

    // Additions
    for (const line of hunk.modifiedChanges) {
      const content = this.escapeHtml(line.content);
      lines.push(`
        <tr>
          <td class="original"></td>
          <td class="modified">${modifiedLineNumber++}</td>
          <td class="marker">+</td>
          <td class="addition">${content}</td>
        </tr>
      `);
    }

    // Trailing context
    for (let i = 0; i < hunk.originalTrailing.length; i++) {
      const line = hunk.originalTrailing[i].content;
      lines.push(`
        <tr>
          <td class="original">${originalLineNumber + i}</td>
          <td class="modified">${modifiedLineNumber + i}</td>
          <td class="marker"> </td>
          <td class="context">${this.escapeHtml(line)}</td>
        </tr>
      `);
    }

    lines.push('</table>');
    lines.push('</div>');

    return lines;
  }

  /**
   * Escape HTML characters
   */
  escapeHtml(text) {
    const escapeMap = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };

    return text.replace(/[&<>"']/g, char => escapeMap[char]);
  }

  /**
   * Calculate checksum for content
   */
  calculateChecksum(content) {
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * Render diff based on format
   */
  render(diff, format = null) {
    const renderFormat = format || diff.config.format;

    switch (renderFormat) {
      case 'unified':
        return this.generateUnifiedFormat(diff);
      case 'context':
        return this.generateContextFormat(diff);
      case 'html':
        return this.generateHtmlFormat(diff);
      case 'json':
        return this.generateJsonFormat(diff);
      default:
        throw new Error(`Unknown format: ${renderFormat}`);
    }
  }

  /**
   * Generate word-level diff (simplified implementation)
   */
  generateWordDiff(original, modified) {
    const originalWords = original.split(/\s+/);
    const modifiedWords = modified.split(/\s+/);

    const hunks = this.findHunks(
      originalWords.map((word, i) => ({ content: word, index: i, processed: word })),
      modifiedWords.map((word, i) => ({ content: word, index: i, processed: word })),
      { contextLines: 0, wordDiff: true }
    );

    return {
      hunks,
      original,
      modified
    };
  }

  /**
   * Create a simple two-panel HTML viewer
   */
  createTwoPanelHtml(diff) {
    const template = `
<!DOCTYPE html>
<html>
<head>
  <title>Diff Viewer</title>
  <style>
    body { font-family: 'Courier New', monospace; margin: 0; padding: 20px; }
    .header { background: #f8f9fa; padding: 10px; border: 1px solid #ddd; margin-bottom: 10px; }
    .panels { display: flex; height: 80vh; }
    .panel { flex: 1; overflow: auto; border: 1px solid #ddd; padding: 10px; }
    .original { border-right: none; }
    .modified { border-left: none; }
    .line { display: flex; }
    .line-number { width: 60px; text-align: right; color: #666; margin-right: 10px; user-select: none; }
    .content { flex: 1; }
    .addition { background-color: #e6ffed; }
    .deletion { background-color: #ffe6e6; }
    .modification { background-color: #fff3cd; }
    .context { background-color: #f8f9fa; }
    .stats { margin: 10px 0; padding: 10px; background: #e9ecef; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="header">
    <h2>Diff: ${diff.config.originalPath} → ${diff.config.modifiedPath}</h2>
    <div class="stats">
      ${diff.stats.additions} additions, ${diff.stats.deletions} deletions,
      ${diff.stats.modifications} modifications, ${diff.stats.similarity}% similar
    </div>
  </div>

  <div class="panels">
    <div class="panel original">
      <h3>Original</h3>
      <div class="content-panel">${this.renderOriginalPanel(diff)}</div>
    </div>

    <div class="panel modified">
      <h3>Modified</h3>
      <div class="content-panel">${this.renderModifiedPanel(diff)}</div>
    </div>
  </div>
</body>
</html>`;

    return template;
  }

  /**
   * Render original panel HTML
   */
  renderOriginalPanel(diff) {
    if (diff.hunks.length === 0) {
      return `<div class="line context"><span class="line-number">1-${diff.original.lines.length}</span><span class="content">${this.escapeHtml(diff.original.content)}</span></div>`;
    }

    const lines = [];
    let lineNumber = 1;

    for (const hunk of diff.hunks) {
      // Context before hunk
      for (const line of hunk.originalContext) {
        lines.push(`<div class="line context"><span class="line-number">${lineNumber++}</span><span class="content">${this.escapeHtml(line.content)}</span></div>`);
      }

      // Deletions from original
      for (const line of hunk.originalChanges) {
        lines.push(`<div class="line deletion"><span class="line-number">${lineNumber++}</span><span class="content">${this.escapeHtml(line.content)}</span></div>`);
      }

      // Context after hunk
      for (const line of hunk.originalTrailing) {
        lines.push(`<div class="line context"><span class="line-number">${lineNumber++}</span><span class="content">${this.escapeHtml(line.content)}</span></div>`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Render modified panel HTML
   */
  renderModifiedPanel(diff) {
    if (diff.hunks.length === 0) {
      return `<div class="line context"><span class="line-number">1-${diff.modified.lines.length}</span><span class="content">${this.escapeHtml(diff.modified.content)}</span></div>`;
    }

    const lines = [];
    let lineNumber = 1;

    for (const hunk of diff.hunks) {
      // Context before hunk
      for (const line of hunk.modifiedContext) {
        lines.push(`<div class="line context"><span class="line-number">${lineNumber++}</span><span class="content">${this.escapeHtml(line.content)}</span></div>`);
      }

      // Additions to modified
      for (const line of hunk.modifiedChanges) {
        lines.push(`<div class="line addition"><span class="line-number">${lineNumber++}</span><span class="content">${this.escapeHtml(line.content)}</span></div>`);
      }

      // Context after hunk
      for (const line of hunk.modifiedTrailing) {
        lines.push(`<div class="line context"><span class="line-number">${lineNumber++}</span><span class="content">${this.escapeHtml(line.content)}</span></div>`);
      }
    }

    return lines.join('\n');
  }
}

module.exports = DiffGenerator;