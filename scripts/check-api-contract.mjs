import { parse } from '@babel/parser';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

const verbs = new Set(['get', 'post', 'put', 'patch', 'delete']);
const unknown = '{}';

export function collectCalls(source, filename = '') {
  const ast = parse(source, { sourceType: 'module', plugins: ['jsx'] });
  const parents = new WeakMap();
  const bindings = new WeakMap();
  const calls = [];
  function scope(node) {
    while (node && !['Program', 'BlockStatement'].includes(node.type)) node = parents.get(node);
    return node;
  }
  function visit(node, parent) {
    if (!node || typeof node !== 'object') return;
    parents.set(node, parent);
    if (node.type === 'VariableDeclarator' && node.id.type === 'Identifier') {
      const block = scope(node);
      if (!bindings.has(block)) bindings.set(block, new Map());
      bindings.get(block).set(node.id.name, node.init);
    }
    if (node.type === 'CallExpression') calls.push(node);
    for (const [key, value] of Object.entries(node)) {
      if (['loc', 'start', 'end', 'extra'].includes(key)) continue;
      if (Array.isArray(value)) value.forEach(child => visit(child, node));
      else if (value && typeof value === 'object') visit(value, node);
    }
  }
  visit(ast.program, null);
  function values(node, seen = new Set()) {
    if (!node) return [];
    if (node.type === 'StringLiteral') return [node.value];
    if (node.type === 'NullLiteral' || node.type === 'BooleanLiteral') return [];
    if (node.type === 'TemplateLiteral') {
      let result = [node.quasis[0].value.cooked];
      node.expressions.forEach((expr, i) => {
        const substitutions = values(expr, seen);
        result = result.flatMap(prefix => (substitutions.length ? substitutions : [unknown])
          .map(value => prefix + value + node.quasis[i + 1].value.cooked));
      });
      return result;
    }
    if (node.type === 'BinaryExpression' && node.operator === '+') {
      return (values(node.left, seen).length ? values(node.left, seen) : [unknown])
        .flatMap(left => (values(node.right, seen).length ? values(node.right, seen) : [unknown]).map(right => left + right));
    }
    if (node.type === 'ConditionalExpression') return [...values(node.consequent, seen), ...values(node.alternate, seen)];
    if (node.type === 'LogicalExpression') return [...values(node.left, seen), ...values(node.right, seen)];
    if (node.type === 'Identifier' && !seen.has(node)) {
      const nextSeen = new Set([...seen, node]);
      for (let block = scope(node); block; block = scope(parents.get(block))) {
        if (bindings.get(block)?.has(node.name)) return values(bindings.get(block).get(node.name), nextSeen);
      }
    }
    return [];
  }
  const result = [];
  for (const node of calls) {
    const callee = node.callee;
    const transport = callee.type === 'MemberExpression' && ['api', 'authApi'].includes(callee.object.name)
      && verbs.has(callee.property.name);
    const resource = callee.type === 'Identifier' && callee.name === 'useApiResource';
    // VenueSchedule's local GET wrapper is checked at each invocation.
    const scheduleGet = filename.endsWith('coordinator/VenueSchedule.jsx') && callee.name === 'get';
    if (!transport && !resource && !scheduleGet) continue;
    const method = transport ? callee.property.name : 'get';
    const base = transport && callee.object.name === 'authApi' ? '/api' : '/api/v1';
    const paths = [...new Set(values(node.arguments[0]))];
    result.push({ file: filename, line: node.loc.start.line, method, base, paths,
      expression: source.slice(node.arguments[0]?.start, node.arguments[0]?.end) });
  }
  return result;
}

// Generic forwarding is checked where callers supply the URL. Dynamic action suffixes
// below are enumerated from BookingAgreement's update(...) calls, rather than ignored.
function reviewedCalls(call) {
  if (call.file === 'hooks/useApiResource.js' && call.expression === 'path') return null;
  if (call.file === 'coordinator/VenueSchedule.jsx' && call.expression === 'path') return null;
  if (call.file === 'components/BookingAgreement.jsx' && call.expression === 'path + suffix') {
    const source = readFileSync(resolve('src', call.file), 'utf8');
    const ast = parse(source, { sourceType: 'module', plugins: ['jsx'] });
    const suffixes = [];
    const scan = node => {
      if (!node || typeof node !== 'object') return;
      if (node.type === 'CallExpression' && node.callee.name === 'update') {
        if (node.arguments[0]?.type !== 'StringLiteral') throw new Error('Use a literal contract action suffix');
        suffixes.push(node.arguments[0].value);
      }
      Object.values(node).forEach(value => Array.isArray(value) ? value.forEach(scan) : value && typeof value === 'object' && scan(value));
    };
    scan(ast.program);
    return suffixes.map(suffix => '/inquiries/{}/booking-agreement' + suffix);
  }
  return call.paths;
}

export function checkCalls(calls, spec, review = call => call.paths) {
  const failures = [];
  let checked = 0;
  for (const call of calls) {
    const paths = review(call);
    if (paths === null) continue;
    if (!paths.length) {
      failures.push(`${call.file}:${call.line} cannot resolve ${call.method.toUpperCase()} ${call.expression}`);
    }
    for (const url of paths) {
      const path = url.split('?')[0];
      // A dynamic value must occupy exactly one path segment. It cannot hide a missing suffix.
      if (!path.startsWith('/') || path.split('/').some(segment => segment.includes(unknown) && segment !== unknown)) {
        failures.push(`${call.file}:${call.line} needs review: ${url}`);
        continue;
      }
      const actual = call.base + path;
      const matches = Object.entries(spec.paths).some(([candidate, methods]) => {
        const pattern = '^' + candidate.split('/').map(segment => /^\{[^}]+\}$/.test(segment)
          ? '(?:[^/]+)' : segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('/') + '$';
        return methods[call.method] && new RegExp(pattern).test(actual);
      });
      if (!matches) failures.push(`${call.file}:${call.line} missing ${call.method.toUpperCase()} ${actual}`);
      checked++;
    }
  }
  return { checked, failures };
}

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : /\.[jt]sx?$/.test(entry.name) && !entry.name.includes('.test.') ? [path] : [];
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const path = process.argv[2] || 'event-backend/target/openapi-contract.json';
  const spec = JSON.parse(readFileSync(path, 'utf8'));
  const calls = sourceFiles(resolve('src')).flatMap(file => collectCalls(readFileSync(file, 'utf8'), relative(resolve('src'), file).replaceAll('\\', '/')));
  const { checked, failures } = checkCalls(calls, spec, reviewedCalls);
  if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
  else console.log(`API contract passed: ${checked} frontend method/path combinations match OpenAPI.`);
}
