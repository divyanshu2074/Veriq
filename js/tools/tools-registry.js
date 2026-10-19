// VeriQ 2.0 - 148 Independent Tools Registry
window.VeriQ = window.VeriQ || {};
window.VeriQ.tools = [];
window.VeriQ.toolsMap = {};

window.VeriQ.registerTool = function(tool) {
  if (!tool || !tool.num || !tool.id) {
    console.error('Invalid tool registration', tool);
    return;
  }
  window.VeriQ.tools.push(tool);
  window.VeriQ.toolsMap[tool.id] = tool;
  window.VeriQ.toolsMap[tool.num] = tool;
};

window.VeriQ.getToolById = function(id) {
  return window.VeriQ.toolsMap[id] || null;
};

window.VeriQ.getToolByNum = function(num) {
  return window.VeriQ.toolsMap[num] || null;
};

window.VeriQ.getToolsByCategory = function(cat) {
  if (!cat || cat === 'all') return window.VeriQ.tools;
  return window.VeriQ.tools.filter(t => t.category.toUpperCase() === cat.toUpperCase());
};

window.VeriQ.searchTools = function(query, category = 'all', mode = 'all') {
  let list = window.VeriQ.tools;

  if (category && category !== 'all') {
    list = list.filter(t => t.category.toUpperCase() === category.toUpperCase());
  }

  if (mode && mode !== 'all') {
    list = list.filter(t => t.executionMode === mode);
  }

  if (!query || !query.trim()) {
    return list;
  }

  const q = query.trim().toLowerCase();
  return list.filter(t => {
    return (
      String(t.num).includes(q) ||
      t.name.toLowerCase().includes(q) ||
      t.purpose.toLowerCase().includes(q) ||
      t.categoryName.toLowerCase().includes(q)
    );
  });
};
