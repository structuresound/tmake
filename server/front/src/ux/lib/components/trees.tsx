import * as React from "react";

let ŭ: number = 0;

class Branch {
  len: number;
  ang: number;
  gen: number;
  limb: any[];
  sway: number;
  mult: number;
  spawn: number;
  vel: number;

  constructor(len: any, ang: any, gen: any, desktop: boolean) {
    this.len = len;
    this.ang = ang;
    this.gen = gen;
    this.limb = [];
    this.sway = 0;
    this.mult = rnd(0.01, 0.1);
    this.spawn = 0;
    this.vel = 0;

    const limA = desktop ? 8 : 7;
    if (gen < limA) {
      this.limb.push(new Branch(len * rnd(0.86, 0.98),
        rnd(0, Math.PI / 6), this.gen + 1, desktop));
      this.limb.push(new Branch(len * rnd(0.86, 0.98),
        rnd(0, -Math.PI / 6), this.gen + 1, desktop));
    }
  }

  disp($: CanvasRenderingContext2D) {
    this.sway++;
    $.save();
    this.vel *= 0.9;
    var dif = 1 - this.spawn;
    this.vel += (dif * 0.1);
    this.spawn += this.vel;

    $.strokeStyle = "hsla(" + (ŭ % 360) + ",100%,50%,.5)";
    $.lineWidth = 1;
    $.beginPath();
    $.rotate(this.ang + (Math.sin(this.sway * this.mult) * Math.PI / 128));
    $.moveTo(0, 0);
    $.lineTo(this.len * this.spawn, 0);
    $.stroke();

    $.translate(this.len * this.spawn, 0);

    if (this.spawn > 0.6) {
      for (var i = 0; i < this.limb.length; i++) {
        var limb = this.limb[i];
        limb.disp($);
      }
    }
    $.restore();
  }
}

function rnd(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export class Trees extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    console.log('tree props', props);
  }
  componentDidMount() {
    this.updateCanvas();
  }
  updateCanvas() {
    const isDesktop = this.props.mq.width > 320;
    const height = isDesktop ? 125 : 80;
    const c: HTMLCanvasElement = this.refs.canvas as any;
    const $ = c.getContext('2d');
    var w = c.width = window.innerWidth;
    var h = c.height = window.innerHeight * .85;
    var w2 = w * 0.5;
    var topiary = new Branch(height, 0, 0, isDesktop);
    var cnt = 0;

    const draw = () => {
      $.save();
      $.clearRect(0, 0, w, h);
      $.translate(w2, h);
      $.rotate(-Math.PI * 0.5);
      topiary.disp($);
      $.restore();
    }

    const anim = () => {
      cnt++;
      ŭ -= .5;
      if (cnt % 2) {
        draw();
      }
      window.requestAnimationFrame(anim);
    }
    anim();
  }
  render() {
    return (
      <canvas ref="canvas" style={{ position: 'absolute', zIndex: -1 }} />
    );
  }
}