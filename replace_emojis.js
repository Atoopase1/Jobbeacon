const fs = require('fs');

const emojiToLucideMap = {
  '💻': 'monitor',
  '🎨': 'palette',
  '📱': 'smartphone',
  '🌐': 'globe',
  '⚙️': 'settings',
  '🔗': 'link',
  '🎮': 'gamepad-2',
  '🤖': 'bot',
  '🧠': 'brain',
  '🔬': 'microscope',
  '📊': 'bar-chart-2',
  '🔒': 'lock',
  '☁️': 'cloud',
  '♾️': 'infinity',
  '✏️': 'pencil',
  '🖼️': 'image',
  '🎬': 'clapperboard',
  '🎞️': 'film',
  '🧊': 'box',
  '⛓️': 'link-2',
  '🐍': 'terminal',
  '⚛️': 'atom',
  '🗄️': 'database',
  '🕵️': 'user-search',
  '🔌': 'plug',
  '💼': 'briefcase',
  '📣': 'megaphone',
  '📲': 'smartphone-charging',
  '🔎': 'search',
  '✍️': 'pen-tool',
  '📧': 'mail',
  '🤝': 'handshake',
  '🛒': 'shopping-cart',
  '📦': 'package',
  '🏷️': 'tag',
  '🔽': 'filter',
  '🎥': 'video',
  '🗂️': 'folder-open',
  '📈': 'trending-up',
  '⭐': 'star',
  '🚀': 'rocket',
  '🔧': 'wrench',
  '🛠️': 'hammer',
  '❄️': 'snowflake',
  '🚗': 'car',
  '🔋': 'battery',
  '📹': 'video',
  '☀️': 'sun',
  '⚡': 'zap',
  '🚁': 'navigation',
  '📷': 'camera',
  '💡': 'lightbulb',
  '🎵': 'music',
  '🎚️': 'sliders-horizontal',
  '🎙️': 'mic',
  '👗': 'shirt',
  '🛋️': 'sofa',
  '🏛️': 'building',
  '🖌️': 'brush',
  '🎭': 'drama',
  '⭕': 'circle',
  '★': 'star',
  '🔍': 'search',
  '🗺️': 'map'
};

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Add lucide script if not present
  if (!content.includes('unpkg.com/lucide')) {
    content = content.replace('</body>', '  <script src="https://unpkg.com/lucide@latest"></script>\n  <script>if(window.lucide) window.lucide.createIcons();</script>\n</body>');
    changed = true;
  }

  if (filePath.endsWith('learn.html')) {
    // 1. Replace JSON icons
    for (const [emoji, iconName] of Object.entries(emojiToLucideMap)) {
      const re = new RegExp(`icon:\\s*'${emoji}'`, 'g');
      if (content.match(re)) {
        content = content.replace(re, `icon: '${iconName}'`);
        changed = true;
      }
    }

    // 2. Replace template renders for JSON icons
    if (content.includes('${cat.icon}')) {
      content = content.replace(/\$\{cat\.icon\}/g, '<i data-lucide="${cat.icon}"></i>');
      changed = true;
    }
    if (content.includes('${sk.icon}')) {
      content = content.replace(/\$\{sk\.icon\}/g, '<i data-lucide="${sk.icon}"></i>');
      changed = true;
    }
    if (content.includes('${f.icon}')) {
      content = content.replace(/\$\{f\.icon\}/g, '<i data-lucide="${f.icon}"></i>');
      changed = true;
    }

    // 3. Inject createIcons calls after rendering HTML dynamically
    if (content.includes('buildCategories();') && !content.includes('setTimeout(() => lucide')) {
      content = content.replace(/buildCategories\(\);/g, 'buildCategories();\n      setTimeout(() => { if(window.lucide) window.lucide.createIcons(); }, 50);');
      changed = true;
    }
    
    // We need to call createIcons after FEATURES injection
    // FEATURES.forEach => $('feat-grid').innerHTML += ... });
    if (content.includes('});\\n\\n    /* ════════════════════════════════\\n       BUILD TRENDING SKILLS SECTION') || content.includes('});\\n    /* ════════════════════════════════')) {
      // It's easier to just replace the specific block
    }
    // Alternatively, just inject a createIcons call before buildCategories
    content = content.replace(/buildCategories\(\);/g, 'setTimeout(() => { if(window.lucide) window.lucide.createIcons(); }, 50);\n      buildCategories();');
  }

  // 4. Global inline emoji replacement in HTML text
  for (const [emoji, iconName] of Object.entries(emojiToLucideMap)) {
    // We only want to replace emojis outside of tags, or inside specific tags.
    // It's safer to just blindly replace the raw emoji character if it's safe.
    // E.g. <span class="ico">🔍</span> -> <span class="ico"><i data-lucide="search"></i></span>
    const regex = new RegExp(emoji, 'g');
    if (content.match(regex)) {
      content = content.replace(regex, `<i data-lucide="${iconName}"></i>`);
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Processed', filePath);
  }
}

const files = [
  './index.html',
  './pages/learn.html',
  './pages/jobs.html',
  './pages/employers.html',
  './pages/dashboard.html',
  './pages/login.html'
];

files.forEach(f => {
  if (fs.existsSync(f)) {
    processFile(f);
  }
});
