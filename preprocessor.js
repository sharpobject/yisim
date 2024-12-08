function preprocessJavaScript(sourceCode, defines = {}) {
  const lines = sourceCode.split('\n');
  const output = [];
  const ifdefStack = [];
  const elseStack = []; // Track whether we've seen an #else for each level
  let currentlyIncluding = true;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Handle #ifdef directive
    if (line.startsWith('#ifdef')) {
      const symbol = line.split(' ')[1];
      const conditionResult = defines[symbol] === true;
      ifdefStack.push(currentlyIncluding);
      elseStack.push(false); // Haven't seen an #else yet for this level
      currentlyIncluding = currentlyIncluding && conditionResult;
      continue;
    }

    // Handle #ifndef directive
    if (line.startsWith('#ifndef')) {
      const symbol = line.split(' ')[1];
      const conditionResult = defines[symbol] !== true;
      ifdefStack.push(currentlyIncluding);
      elseStack.push(false); // Haven't seen an #else yet for this level
      currentlyIncluding = currentlyIncluding && conditionResult;
      continue;
    }

    // Handle #else directive
    if (line === '#else' || line.startsWith('#else ')) {
      if (ifdefStack.length === 0) {
        throw new Error(`Unmatched #else at line ${i + 1}`);
      }
      if (elseStack[elseStack.length - 1]) {
        throw new Error(`Multiple #else directives for the same #if* at line ${i + 1}`);
      }
      elseStack[elseStack.length - 1] = true;
      const parentIncluding = ifdefStack[ifdefStack.length - 1];
      currentlyIncluding = parentIncluding && !currentlyIncluding;
      continue;
    }

    // Handle #endif directive
    if (line === '#endif' || line.startsWith('#endif ')) {
      if (ifdefStack.length === 0) {
        throw new Error(`Unmatched #endif at line ${i + 1}`);
      }
      currentlyIncluding = ifdefStack.pop();
      elseStack.pop();
      continue;
    }

    // Include the line if we're in an active branch
    if (currentlyIncluding) {
      output.push(lines[i]);
    }
  }

  // Check for unmatched #ifdef/#ifndef
  if (ifdefStack.length > 0) {
    throw new Error('Unmatched #ifdef or #ifndef directive');
  }

  return output.join('\n');
}

export { preprocessJavaScript };