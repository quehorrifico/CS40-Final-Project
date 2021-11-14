"use strict";
import * as twgl from "./lib/twgl/dist/4.x/twgl-full.module.js";
import {GUI} from "./lib/dat/dat.gui.module.js";
import Stats from "./lib/stats/stats.module.js";
import vshader from "./vshader.js";
import fshader from "./fshader.js";


const gl = document.querySelector("#final").getContext("webgl2");
let controls = {};
const gui = new GUI();

let programInfo, bufferInfo, vao;
let uniforms = {};

const stats = createStatBox();

/* Create a small stats panel using the
   https://github.com/mrdoob/stats.js/ stats library
*/
function createStatBox(){
  let stats = new Stats();
  stats.showPanel(1);  // 0: fps, 1: ms, 2: mb, 3+: custom
  document.body.appendChild( stats.dom );
  return stats;
}

/* Add GUI controller for modifying uniform variables */
function setupControls(){
   controls.y = 7;
   controls.x = 10.;
   controls.z = 0.0;
   gui.add(controls, "x").min(-20).max(20).step(1);
   gui.add(controls, "y").min(-20).max(20).step(1);
   gui.add(controls, "z").min(-20).max(20).step(1);
}

function main(){
  if(gl){
    init();
    window.requestAnimationFrame(render);
  }
}

function init(){
  /* The init function will only get called once per page load
     and do the initial setup of variables, models, shaders, etc.
  */
  setupControls();

  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  gl.clearColor(0.9,0.9,0.9,1.);

  programInfo = twgl.createProgramInfo(gl, [vshader, fshader]);

  twgl.setAttributePrefix("a_");

  /* Instead of creating 3D geometry ourselves,
     we will typically use twgl tools to build default primitives
     Theses calls typically create bufferInfo objects with the following
     attributes:
        position: the location of each vertex
        texcoord: texture coordinate for each vertex
        normal: surface normal for each vertex
        indices: an array of indices, specifying the order in which
          to draw elements from the position array.
  */

  const square = {
    position: { numComponents: 2,
    data: [-1, -1, 1,-1, -1, 1, 1, 1] }
  };
  bufferInfo = twgl.createBufferInfoFromArrays(gl, square);

  /* create a sphere primitive of radius three
     using 20 slices, 20 stacks -> 800 triangles */
  //bufferInfo = twgl.primitives.createSphereBufferInfo(gl, 0.5, 80, 80);

  vao = twgl.createVAOFromBufferInfo(gl, programInfo, bufferInfo);
}

/* adjust viewport, ortho matrix on resize */
function resize(){
  let width = gl.canvas.clientWidth;
  let height = gl.canvas.clientHeight;
  if (gl.canvas.width != width ||
     gl.canvas.height != height || !uniforms.u_projection) {
     gl.canvas.width = width;
     gl.canvas.height = height;
     twgl.resizeCanvasToDisplaySize(gl.canvas);
     gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  }
  uniforms.iResolution = [width, height, 1];
}

function render(time) {
    stats.begin();

    time *= 0.001; //convert to seconds

    /* resize the gl drawing context to the canvas */
    resize();

    /* clear the screen */
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(programInfo.program);
    gl.bindVertexArray(vao);

    uniforms.iTime = time;
    uniforms.u_x = controls.x;
    uniforms.u_y = controls.y;
    uniforms.u_z = controls.z;

    /* ProgramInfo here, not program */
    twgl.setUniforms(programInfo, uniforms);

    let mode = gl.TRIANGLE_STRIP;
    gl.drawArrays(mode, 0, 4);

    stats.end();

    /* Render the scene again (a potential animation loop) */
    window.requestAnimationFrame(render);
}

// Run our main program
main();
