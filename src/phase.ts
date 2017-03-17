import * as _ from 'lodash';
import * as Bluebird from 'bluebird';
import { contains, check, safeOLHM, OLHM, arrayify } from 'js-object-tools';

import { errors } from './errors';

import { CmdObj } from './iterate';

import { CMake } from './cmake';
import { Ninja } from './ninja';
import { Runtime } from './runtime';


export class Phase implements TMake.Plugins {
  /* implements Plugins */
  replace: any;
  create: any;
  shell: any;
  ninja: Ninja;
  cmake: CMake;
  /**/

  commands: CmdObj[];

  constructor(input) {
    this.commands = [];
    if (check(input, String)) {
      if (Runtime.getPlugin(input)) {
        this.commands.push({ cmd: input });
      } else {
        throw new Error(`plugin ${input} not loaded`);
      }
    } else if (check(input, Array)) {
      throw new Error('base of seection should not be an array, use a plugin name, or an object containing plugin configurations')
    } else if (check(input, Object)) {
      for (const k of Object.keys(input)) {
        if (Runtime.getPlugin(k)) {
          this.commands.push({ arg: input[k], cmd: k });
        } else if (contains(['create', 'replace'], k)) {
          this.commands.push({ arg: input[k], cmd: k });
        } else if (contains(['shell'], k)) {
          arrayify(input[k]).forEach((shellCmd) => {
            this.commands.push({ arg: '', cmd: shellCmd });
          });
        }
      }
    }
  }

}