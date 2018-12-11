/* GLOBAL CONSTANTS AND VARIABLES */

/* assignment specific globals */
const WIN_Z = 0;  // default graphics window z coord in world space
const WIN_LEFT = 0; const WIN_RIGHT = 1;  // default left and right x coords in world space
const WIN_BOTTOM = 0; const WIN_TOP = 1;  // default top and bottom y coords in world space
var Eye = new vec4.fromValues(0.5,0.5,-0.5,1.0); // default eye position in world space

/* webgl globals */
var gl = null; // the all powerful gl object. It's all here folks!
var grid;
var vertexBuffer; // this contains vertex coordinates in triples
var triangleBuffer; // this contains indices into vertexBuffer in triples
var triBufferSize; // the number of indices in the triangle buffer
var vertexPositionAttrib; // where to put position for vertex shader
var vertexColorAttrib; // where to put color for vertex shader


// ASSIGNMENT HELPER FUNCTIONS

// set up the webGL environment
function setupWebGL() {

    // Get the canvas and context
    var canvas = document.getElementById("webGLCanvas"); // create a js canvas
    gl = canvas.getContext("webgl"); // get a webgl object from it

    try {
      if (gl == null) {
        throw "unable to create gl context -- is your browser gl ready?";
      } else {
        gl.clearColor(0.0, 0.0, 0.0, 1.0); // use black when we clear the frame buffer
        gl.clearDepth(1.0); // use max when we clear the depth buffer
        gl.enable(gl.DEPTH_TEST); // use hidden surface removal (with zbuffering)
      }
    } // end try

    catch(e) {
      console.log(e);
    } // end catch

} // end setupWebGL

/**
 * Draw walls and head from grid.
 */
function loadTriangles() {
    var whichSetColor;
    var coordArray = []; // 1D array of vertex coords for WebGL
    var triArray = []; // 1D array of triangle vertex indices
    var colors = [] // array to hold all the colors
    var cubeCoordArray = [];
    var indices = [];
    // end for each triangle set
    // console.log(coordArray.length);
    // send the vertex coords to webGL

    grid = new Array(50);
    for (var i = 0; i < grid.length; i++) {
      grid[i] = new Array(50);
      for (var j = 0; j < grid[i].length; j++ ) {
        grid[i][j] = {
          occupant: "E",
        };
        if (i == 0 || j == 0 || i == 49 || j == 49) {
          grid[i][j].occupant = "W";
        }
      }
    }

    // Read grid
    for (var i = 0; i < grid.length; i++) {
      for (var j = 0; j < grid[i].length; j++) {
        if (grid[i][j].occupant == "W") {
          // define front face


        }
      }
    }
    fLX = ((0 / 50) * 2) - 1; // front left X coord
    fRX = fLX + .04; // front right X coord
    fTY = ((((0 + 1)/ 50) * 2) - 1); // front top Y coord
    fBY = fTY - .04; // front bottom Y coord
    fZ = -.02; // front Z coord
    bZ = .02; // back Z coord

    cubeCoordArray = [
      // Front face
      fLX, fBY, fZ,
      fLX, fTY, fZ,
      fRX, fTY, fZ,
      fRX, fBY, fZ,

      // Back face
      fLX, fBY, bZ,
      fLX, fTY, bZ,
      fRX, fTY, bZ,
      fRX, fBY, bZ,

      // Top face
      fLX, fTY, fZ,
      fLX, fTY, bZ,
      fRX, fTY, bZ,
      fRX, fTY, fZ,

      // Bottom face
      fLX, fBY, fZ,
      fRX, fBY, fZ,
      fRX, fBY, bZ,
      fLX, fBY, bZ,

      // Right Face
      fRX, fBY, fZ,
      fRX, fTY, fZ,
      fRX, fTY, bZ,
      fRX, fBY, bZ,

      // Left Face
      fLX, fBY, fZ,
      fLX, fBY, bZ,
      fLX, fTY, bZ,
      fLX, fTY, fZ
    ];
    colors [
      1, 1, 1,    1, 1, 1,
      1, 1, 1,    1, 1, 1,
      1, 1, 1,    1, 1, 1,
      1, 1, 1,    1, 1, 1,
      1, 1, 1,    1, 1, 1,
      1, 1, 1,    1, 1, 1
    ];

    indices = [
      0,  1,  2,      0,  2,  3,    // front
      4,  5,  6,      4,  6,  7,    // back
      8,  9,  10,     8,  10, 11,   // top
      12, 13, 14,     12, 14, 15,   // bottom
      16, 17, 18,     16, 18, 19,   // right
      20, 21, 22,     20, 22, 23,   // left
    ];
    // determine how to calculate
    // get the coords of the front face.
    // build the coords of the others using the front face using front z = .02
    //     - and back z = -.02

    vertexBuffer = gl.createBuffer(); // init empty vertex coord buffer
    gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffer); // activate that buffer
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(cubeCoordArray),gl.STATIC_DRAW); // coords to that buffer

    // Create element buffer
    triangleBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
    triBufferSize = indices.length;

    // create color buffer
    colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

}

// setup the webGL shaders
function setupShaders() {

    // define fragment shader in essl using es6 template strings
    var fShaderCode = `
        varying lowp float vColor;

        void main(void) {
          if (vColor == 1.0) {
            gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
          }
        }
    `;

    // define vertex shader in essl using es6 template strings
    var vShaderCode = `
        attribute vec3 vertexPosition;
        attribute lowp float vertexColor;

        varying lowp float vColor;

        void main(void) {
            gl_Position = vec4(vertexPosition, 1.0); // use the untransformed position
            vColor = vertexColor;
        }
    `;

    try {
        // console.log("fragment shader: "+fShaderCode);
        var fShader = gl.createShader(gl.FRAGMENT_SHADER); // create frag shader
        gl.shaderSource(fShader,fShaderCode); // attach code to shader
        gl.compileShader(fShader); // compile the code for gpu execution

        // console.log("vertex shader: "+vShaderCode);
        var vShader = gl.createShader(gl.VERTEX_SHADER); // create vertex shader
        gl.shaderSource(vShader,vShaderCode); // attach code to shader
        gl.compileShader(vShader); // compile the code for gpu execution

        if (!gl.getShaderParameter(fShader, gl.COMPILE_STATUS)) { // bad frag shader compile
            throw "error during fragment shader compile: " + gl.getShaderInfoLog(fShader);
            gl.deleteShader(fShader);
        } else if (!gl.getShaderParameter(vShader, gl.COMPILE_STATUS)) { // bad vertex shader compile
            throw "error during vertex shader compile: " + gl.getShaderInfoLog(vShader);
            gl.deleteShader(vShader);
        } else { // no compile errors
            var shaderProgram = gl.createProgram(); // create the single shader program
            gl.attachShader(shaderProgram, fShader); // put frag shader in program
            gl.attachShader(shaderProgram, vShader); // put vertex shader in program
            gl.linkProgram(shaderProgram); // link program into gl context

            if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) { // bad program link
                throw "error during shader program linking: " + gl.getProgramInfoLog(shaderProgram);
            } else { // no shader program link errors
                gl.useProgram(shaderProgram); // activate shader program (frag and vert)

                vertexPositionAttrib = gl.getAttribLocation(shaderProgram, "vertexPosition");
                gl.enableVertexAttribArray(vertexPositionAttrib); // input to shader from array

                vertexColorAttrib = gl.getAttribLocation(shaderProgram, "vertexColor");
                gl.enableVertexAttribArray(vertexColorAttrib);
            } // end if no shader program link errors
        } // end if no compile errors
    } // end try

    catch(e) {
        console.log(e);
    } // end catch
} // end setup shaders

// render the loaded model
function renderTriangles() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // clear frame/depth buffers

    // vertex buffer: activate and feed into vertex shader
    gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffer); // activate
    gl.vertexAttribPointer(vertexPositionAttrib,3,gl.FLOAT,false,0,0); // feed

    gl.bindBuffer(gl.ARRAY_BUFFER,colorBuffer);
    gl.vertexAttribPointer(vertexColorAttrib, 1, gl.FLOAT, false, 0,0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleBuffer);
    gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0); // render
} // end render triangles


/* MAIN -- HERE is where execution begins after window load */

function main() {

  setupWebGL(); // set up the webGL environment
  loadTriangles(); // load in the triangles from tri file
  setupShaders(); //setup the webGL shaders
  renderTriangles(); // draw the triangles using webGL

} // end main
