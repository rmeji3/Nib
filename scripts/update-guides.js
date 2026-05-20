const fs = require('fs');
const path = require('path');

// Root paths
const rootDir = path.resolve(__dirname, '..');
const frontendDir = path.join(rootDir, 'frontend');
const backendDir = path.join(rootDir, 'backend');

// Utility: Read directory recursively
function readDirRecursive(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      readDirRecursive(filePath, fileList);
    } else {
      fileList.push(filePath);
    }
  }
  return fileList;
}

// Utility: Inject block inside markers
function replaceBlock(filePath, startMarker, endMarker, newContent) {
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const startIndex = content.indexOf(startMarker);
  const endIndex = content.indexOf(endMarker);
  if (startIndex === -1 || endIndex === -1) {
    console.error(`Markers not found in ${filePath}`);
    return;
  }
  const before = content.substring(0, startIndex + startMarker.length);
  const after = content.substring(endIndex);
  const updated = before + '\n' + newContent + '\n' + after;
  fs.writeFileSync(filePath, updated, 'utf8');
  console.log(`Successfully updated ${path.relative(rootDir, filePath)}`);
}

// === FRONTEND SCANNER ===
function scanFrontend() {
  console.log('Scanning Frontend...');
  const appDir = path.join(frontendDir, 'app');
  const componentsDir = path.join(frontendDir, 'components');
  
  // 1. Scan Routes
  const routes = [];
  const allAppFiles = readDirRecursive(appDir);
  for (const file of allAppFiles) {
    const relative = path.relative(appDir, file);
    const basename = path.basename(file);
    
    // Check for Next.js routes
    if (basename === 'page.tsx' || basename === 'route.ts') {
      const parts = path.dirname(relative).split(path.sep);
      // Clean route group folders like (auth)
      const cleanParts = parts.filter(part => part !== '.' && !part.startsWith('(') && !part.endsWith(')'));
      let routePath = '/' + cleanParts.join('/');
      if (routePath.length > 1 && routePath.endsWith('/')) {
        routePath = routePath.slice(0, -1);
      }
      routes.push({
        path: routePath,
        file: `frontend/app/${relative.replace(/\\/g, '/')}`,
        type: basename === 'page.tsx' ? 'Page' : 'API Route'
      });
    }
  }
  routes.sort((a, b) => a.path.localeCompare(b.path));

  // 2. Scan Features
  const features = {};
  const featuresDir = path.join(appDir, 'features');
  if (fs.existsSync(featuresDir)) {
    const featFolders = fs.readdirSync(featuresDir);
    for (const folder of featFolders) {
      const folderPath = path.join(featuresDir, folder);
      if (fs.statSync(folderPath).isDirectory()) {
        features[folder] = {
          components: [],
          hooks: [],
          services: [],
          other: []
        };
        const featFiles = readDirRecursive(folderPath);
        for (const file of featFiles) {
          const rel = path.relative(folderPath, file).replace(/\\/g, '/');
          const category = rel.split('/')[0];
          if (category === 'components') {
            features[folder].components.push(rel);
          } else if (category === 'hooks') {
            features[folder].hooks.push(rel);
          } else if (category === 'services' || category === 'api') {
            features[folder].services.push(rel);
          } else {
            features[folder].other.push(rel);
          }
        }
      }
    }
  }

  // 3. Scan Global Components
  const globalComponents = [];
  if (fs.existsSync(componentsDir)) {
    const compFiles = readDirRecursive(componentsDir);
    for (const file of compFiles) {
      const rel = path.relative(componentsDir, file).replace(/\\/g, '/');
      if (rel.endsWith('.tsx') || rel.endsWith('.ts')) {
        globalComponents.push(rel);
      }
    }
  }

  // Format Frontend Markdown
  let md = '### App Routing Map\n\n| URL Route | Type | File Path |\n| --- | --- | --- |\n';
  if (routes.length === 0) {
    md += '| *None found* | - | - |\n';
  } else {
    for (const r of routes) {
      md += `| \`${r.path}\` | ${r.type} | [\`${path.basename(r.file)}\`](file:///${path.join(rootDir, r.file).replace(/\\/g, '/')}) |\n`;
    }
  }

  md += '\n### Feature Modules (`frontend/app/features`)\n\n';
  const featureNames = Object.keys(features);
  if (featureNames.length === 0) {
    md += '*No feature modules found.*\n';
  } else {
    for (const fn of featureNames) {
      md += `#### Feature: \`${fn}\`\n`;
      const f = features[fn];
      
      if (f.components.length > 0) {
        md += `- **Components**:\n`;
        for (const c of f.components) {
          md += `  - [\`${path.basename(c)}\`](file:///${path.join(featuresDir, fn, c).replace(/\\/g, '/')})\n`;
        }
      }
      if (f.hooks.length > 0) {
        md += `- **Hooks**:\n`;
        for (const h of f.hooks) {
          md += `  - [\`${path.basename(h)}\`](file:///${path.join(featuresDir, fn, h).replace(/\\/g, '/')})\n`;
        }
      }
      if (f.services.length > 0) {
        md += `- **Services/API**:\n`;
        for (const s of f.services) {
          md += `  - [\`${path.basename(s)}\`](file:///${path.join(featuresDir, fn, s).replace(/\\/g, '/')})\n`;
        }
      }
      md += '\n';
    }
  }

  md += '### Shared Global Components (`frontend/components`)\n\n';
  if (globalComponents.length === 0) {
    md += '*No shared components found.*\n';
  } else {
    for (const gc of globalComponents) {
      md += `- [\`${gc}\`](file:///${path.join(componentsDir, gc).replace(/\\/g, '/')})\n`;
    }
  }

  // Inject into frontend guide
  const guidePath = path.join(frontendDir, 'GUIDE.md');
  replaceBlock(guidePath, '<!-- START_AUTO_MAP -->', '<!-- END_AUTO_MAP -->', md);
}

// === BACKEND SCANNER ===
function scanBackend() {
  console.log('Scanning Backend...');
  const javaSrcDir = path.join(backendDir, 'src', 'main', 'java', 'com', 'nib', 'backend');
  
  if (!fs.existsSync(javaSrcDir)) {
    console.error(`Java source folder not found at: ${javaSrcDir}`);
    return;
  }

  const controllers = [];
  const models = [];
  const repositories = [];
  const services = [];
  const dtos = [];

  const allJavaFiles = readDirRecursive(javaSrcDir);
  for (const file of allJavaFiles) {
    const relative = path.relative(javaSrcDir, file).replace(/\\/g, '/');
    const folder = relative.split('/')[0];
    const className = path.basename(file, '.java');

    if (folder === 'controller') {
      // Parse endpoints from Controller
      const content = fs.readFileSync(file, 'utf8');
      
      // Get base request mapping
      let baseMapping = '';
      const baseMatch = content.match(/@RequestMapping\s*\(\s*(?:value\s*=\s*)?["']([^"']+)["']/);
      if (baseMatch) {
        baseMapping = baseMatch[1];
      }

      // Parse method mappings
      const methods = [
        { annotation: 'GetMapping', verb: 'GET' },
        { annotation: 'PostMapping', verb: 'POST' },
        { annotation: 'PutMapping', verb: 'PUT' },
        { annotation: 'DeleteMapping', verb: 'DELETE' },
        { annotation: 'PatchMapping', verb: 'PATCH' }
      ];

      const endpoints = [];
      for (const m of methods) {
        // Regex to capture @GetMapping("/path")
        const regex = new RegExp(`@${m.annotation}\\s*\\(\\s*(?:value\\s*=\\s*)?["']([^"']+)["']`, 'g');
        let match;
        while ((match = regex.exec(content)) !== null) {
          const fullPath = (baseMapping + match[1]).replace(/\/+/g, '/');
          endpoints.push({ verb: m.verb, path: fullPath });
        }

        // Regex to capture standalone annotation @GetMapping without parameters
        const standaloneRegex = new RegExp(`@${m.annotation}\\s*(?:\\(\\s*\\))?\\s*(?:\\n|\\r|[^\\(])*\\s+public\\s+`, 'g');
        let emptyMatch;
        while ((emptyMatch = standaloneRegex.exec(content)) !== null) {
          const slice = content.substring(emptyMatch.index, emptyMatch.index + 60);
          if (!slice.includes('("') && !slice.includes('(\'')) {
            const fullPath = baseMapping === '' ? '/' : baseMapping.replace(/\/+/g, '/');
            endpoints.push({ verb: m.verb, path: fullPath });
          }
        }
      }

      controllers.push({
        className,
        file,
        endpoints
      });
    } else if (folder === 'model') {
      models.push({ className, file });
    } else if (folder === 'repository') {
      repositories.push({ className, file });
    } else if (folder === 'service') {
      services.push({ className, file });
    } else if (folder === 'dto') {
      dtos.push({ className, file });
    }
  }

  // Format Backend Markdown
  let md = '### API Controller & Endpoints Map\n\n';
  if (controllers.length === 0) {
    md += '*No controllers found.*\n';
  } else {
    for (const c of controllers) {
      md += `#### Controller: [\`${c.className}\`](file:///${c.file.replace(/\\/g, '/')})\n`;
      if (c.endpoints.length === 0) {
        md += `- *No exposed REST endpoints detected.*\n`;
      } else {
        md += `| Verb | Endpoint Route |\n| --- | --- |\n`;
        for (const ep of c.endpoints) {
          md += `| \`${ep.verb}\` | \`${ep.path}\` |\n`;
        }
      }
      md += '\n';
    }
  }

  md += '### Database Entities (`backend/src/.../model`)\n\n';
  if (models.length === 0) {
    md += '*No JPA entity models found.*\n';
  } else {
    for (const m of models) {
      md += `- [\`${m.className}\`](file:///${m.file.replace(/\\/g, '/')})\n`;
    }
    md += '\n';
  }

  md += '### Data Access Repositories (`backend/src/.../repository`)\n\n';
  if (repositories.length === 0) {
    md += '*No repositories found.*\n';
  } else {
    for (const r of repositories) {
      md += `- [\`${r.className}\`](file:///${r.file.replace(/\\/g, '/')})\n`;
    }
    md += '\n';
  }

  md += '### Business Services (`backend/src/.../service`)\n\n';
  if (services.length === 0) {
    md += '*No service classes found.*\n';
  } else {
    for (const s of services) {
      md += `- [\`${s.className}\`](file:///${s.file.replace(/\\/g, '/')})\n`;
    }
    md += '\n';
  }

  md += '### Data Transfer Objects (`backend/src/.../dto`)\n\n';
  if (dtos.length === 0) {
    md += '*No DTO records found.*\n';
  } else {
    for (const d of dtos) {
      md += `- [\`${d.className}\`](file:///${d.file.replace(/\\/g, '/')})\n`;
    }
    md += '\n';
  }

  // Inject into backend guide
  const guidePath = path.join(backendDir, 'GUIDE.md');
  replaceBlock(guidePath, '<!-- START_AUTO_MAP -->', '<!-- END_AUTO_MAP -->', md);
}

// === RUN MAIN ===
try {
  scanFrontend();
  scanBackend();
  console.log('All developer guides successfully synchronized.');
} catch (err) {
  console.error('Failed to update developer guides:', err);
  process.exit(1);
}
