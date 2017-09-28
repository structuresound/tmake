// import { combine } from 'typed-json-transform';

const purple = 'rgb(127, 63,   162)'
const magenta = 'rgb(255, 0,   133)'
const red = 'rgb(237, 28,   36)'
const orange = 'rgb(251, 176, 64)'
const yellow = 'rgb(255, 222, 23)'
const green = 'rgb(0, 161, 75)'
const turquoise = 'rgb(0,   176, 188)'
const cyan = 'rgb(0,   173, 243)'
const blue = 'rgb(33,   64, 154)'
const white = 'rgb(255, 255, 255)'

const gray = {
  lighter: 'rgb(238, 238, 238)',
  darker: 'rgb(100, 100, 100)'
}


export const colors = {
  purple, magenta, red, orange, yellow,
  green, turquoise, cyan, blue, gray
}

export const gradients =
  {
    rainbow:
    `linear-gradient(to left, ${purple}, ${blue}, ${green}, ${yellow}, ${orange}, ${red})`
  }

export const layout = { navbar: { height: '64px' } }

export const aligner = {
  fullscreen: {
    minHeight: '80vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  withHeight: (height: string) => {
    return {
      height: height,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  },
  upperTwoThirds: {
    height: '66%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  form: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
  item: { maxWidth: '100%' },
  itemTop: { alignSelf: 'flex-start' },
  itemBottom: { alignSelf: 'flex-end' }
}