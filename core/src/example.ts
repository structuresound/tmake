import { Git } from './git';
import { log } from './log';
import * as colors from 'chalk';


const examples = [
  { name: 'hello world', type: 'binary', git: 'structuresound/tmakeExample' },
  { name: 'tmake repository server', type: 'binary', git: 'structuresound/tmakeServer' },
  { name: 'nodeKitten', type: 'library', git: 'structuresound/nodeKitten' }
]

export function example() {
  log.log(`
***
* ${colors.magenta('Tmake Examples')}
***
`);
  for (const example of examples) {
    const g = new Git(example.git);
    log.log(colors.green('git clone'), colors.gray(`https://github.com/${g.organization}/`) + colors.magenta(g.repository));
  }
  log.log(`
${colors.green('cd')} ${colors.magenta('[example directory]')} && ${colors.green('tmake')}
  `);
}