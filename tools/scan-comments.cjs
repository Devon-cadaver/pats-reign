// finds lines where a // comment is followed by what looks like code (a comment that swallowed the rest of a line)
const fs = require('fs');
const files = ['src/main.js', 'src/minigames.js', 'src/music.js', 'src/audio.js', 'src/ship.js', 'src/env.js', 'src/monsters.js', 'src/geom.js'];
const codeLike = /(\bif \(|\bconst |\blet |\breturn\b|\bfor \(|\}\);|\) \{|\w\(.*\);)/;
let found = 0;
for (const f of files) {
  const lines = fs.readFileSync(f, 'utf8').split(/\r?\n/);
  lines.forEach((l, i) => {
    let inS = null;
    for (let j = 0; j < l.length - 1; j++) {
      const c = l[j];
      if (inS) { if (c === '\\') { j++; continue; } if (c === inS) inS = null; continue; }
      if (c === "'" || c === '"' || c === '`') { inS = c; continue; }
      if (c === '/' && l[j + 1] === '/') {
        const rest = l.slice(j + 2);
        if (codeLike.test(rest) && !/https?:$/.test(l.slice(0, j))) { console.log(f + ':' + (i + 1) + ': ' + rest.slice(0, 110)); found++; }
        break;
      }
    }
  });
}
console.log('lines flagged:', found);
