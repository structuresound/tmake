import { Git } from './git';
import { log } from './log';
import * as colors from 'chalk';


const examples = [
  { name: 'hello world', type: 'binary', git: 'structuresound/tmakeExample' },
  { name: 'tmake repository server', type: 'binary', git: 'structuresound/tmakeServer' }
]

export function example() {
  console.log(`
***
* ${colors.magenta('Tmake Examples')}
***
`);
  for (const example of examples) {
    const g = new Git(example.git);
    log.log(colors.green('git clone'), colors.gray(`https://github.com/${g.organization}/`) + colors.magenta(g.repository));
  }
  console.log(`
${colors.green('cd')} ${colors.magenta('[example directory]')} && ${colors.green('tmake')}
  `);
}