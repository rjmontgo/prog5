/* GLOBAL CONSTANTS AND VARIABLES */

/* assignment specific globals */
const WIN_Z = 0;  // default graphics window z coord in world space
const WIN_LEFT = 0; const WIN_RIGHT = 1;  // default left and right x coords in world space
const WIN_BOTTOM = 0; const WIN_TOP = 1;  // default top and bottom y coords in world space
var eye = new vec3.fromValues(0 , -1 ,-1.2)
var up = new vec3.fromValues(0,1,0);
var lookat = new vec3.fromValues(0,.4,1);

/* webgl globals */
var gl = null; // the all powerful gl object. It's all here folks!
var grid;
var view;
var vertexBuffer; // this contains vertex coordinates in triples
var triangleBuffer; // this contains indices into vertexBuffer in triples
var triBufferSize; // the number of indices in the triangle buffer
var vertexPositionAttrib; // where to put position for vertex shader
var vertexColorAttrib; // where to put color for vertex shader
var lastKeyPress;
var headCoords;
var fpsInterval;
var then;
var now;
var tail;

document.addEventListener('keydown', function(keypress) {
  lastKeyPress = keypress.key;
});


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
    tail = [];
    fpsInterval = 1000 / 5;
    then = Date.now();
    headCoords = [25, 40];

    var tmp = mat4.create();
    view = mat4.create();
    mat4.perspective(tmp, Math.PI/2, gl.canvas.clientWidth / gl.canvas.clientHeight, .1, 100);

    var focus = vec3.fromValues(eye[0] + lookat[0], eye[1] + lookat[1], eye[2] + lookat[2]);
    var target = mat4.create();
    mat4.lookAt(target, eye, focus, up);
    mat4.multiply(view, tmp, mat4.lookAt(target, eye, focus, up));
    // end for each triangle set
    // console.log(coordArray.length);
    // send the vertex coords to webGL

    grid = new Array(50);
    for (var i = 0; i < grid.length; i++) {
      grid[i] = new Array(50);
      for (var j = 0; j < grid[i].length; j++ ) {
        grid[i][j] = {
          occupant: "E",
          direction: [0,0]
        };
        if (i == 0 || j == 0 || i == 49 || j == 49) {
          grid[i][j].occupant = "W";
        }
        if (i == 25 && (j == 40) ) {
          grid[i][j].occupant = "H";
        }
        if ((i == 15 || i == 35) && (j == 15 || j == 35)) {
          grid[i][j].occupant = "F";
        }
      }
    }
    updateBuffers();

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
          if (vColor == 1.0) { // wall color
            gl_FragColor = vec4(0.5, 1.0, 1.0, 1.0);

          } else if (vColor == 2.0) { // wall side color
            gl_FragColor = vec4(0.5, 0.7, 0.7, 1.0);

          } else if (vColor == 3.0) { // snake color
            gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0);

          } else if (vColor == 4.0) { // snake shadow color
            gl_FragColor = vec4(0.0, 0.5, 0.0, 1.0);

          } else if (vColor == 5.0) { // floor color
            gl_FragColor = vec4(0.7, 0.7, 0.7, 1.0);

          } else if (vColor == 6.0) { // food color
            gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);

          } else if (vColor == 7.0) { // food shadow color
            gl_FragColor = vec4(0.7, 0.0, 0.0, 1.0);

          }
        }
    `;

    // define vertex shader in essl using es6 template strings
    var vShaderCode = `
        attribute vec3 vertexPosition;
        attribute lowp float vertexColor;
        uniform mat4 view;

        varying lowp float vColor;

        void main(void) {
            gl_Position = view * vec4(vertexPosition, 1.0); // use the untransformed position
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

                var viewLoc = gl.getUniformLocation(shaderProgram, "view");
                gl.uniformMatrix4fv(viewLoc, false, view);
            } // end if no shader program link errors
        } // end if no compile errors
    } // end try

    catch(e) {
        console.log(e);
    } // end catch
} // end setup shaders

function updateGraph() {
  var transform;
  //for (var i = 0; i < grid.length; i++) { console.log(grid[i].map(function (elem) { return elem.occupant }).join()); }
  if (!lastKeyPress || lastKeyPress == "w") {
    transform = [0, -1];
  } else if (lastKeyPress == "a") {
    transform = [1, 0];
  } else if (lastKeyPress == "s") {
    transform = [0, 1];
  } else if (lastKeyPress == "d") {
    transform = [-1, 0];
  }
  // set coords for tail
  grid[headCoords[0]][headCoords[1]].direction = transform;
  var newX = headCoords[0] + transform[0];
  var newY = headCoords[1] + transform[1];

  // collisions
  if (grid[newX][newY].occupant == "F") {
    // grow tail
    if (tail.length == 0) {
      tail.push([headCoords[0] - transform[0], headCoords[1] - transform[1]]);

    } else {
      var x = tail[tail.length - 1][0];
      var y = tail[tail.length - 1][1];
      var dir = grid[x][y].direction;
      tail.push([x - dir[0], y - dir[1]]);
    }
  } else if (grid[newX][newY].occupant == "T") {
    console.log("Fail");
  } else {
    // no collison
    if (tail.length == 0) {
      grid[headCoords[0]][headCoords[1]].occupant = "E";
    }
  }
  // update tail
  var tailEndX;
  var tailEndY;
  for (var i = 0; i < tail.length; i++) {
    var x = tail[i][0];
    var y = tail[i][1];
    var dir = grid[x][y].direction;
    tail[i][0] = x + dir[0];
    tail[i][1] = y + dir[1];
    if (i == tail.length - 1) {
      tailEndX = x;
      tailEndY = y;
    }
  }
  for (var i = 0; i < tail.length; i++) {
    var x = tail[i][0];
    var y = tail[i][1];
    grid[x][y].occupant = "T";
    if (i == tail.length - 1) {
      grid[tailEndX][tailEndY].occupant = "E";
    }
  }

  grid[newX][newY].occupant = "H"
  headCoords[0] = newX;
  headCoords[1] = newY;

}

function updateBuffers() {
  // Read grid
  var cubeCoordArray = [];
  var colors = [];
  var indices = [];
  var incs = 0;
  for (var i = 0; i < grid.length; i++) {
    for (var j = 0; j < grid[i].length; j++) {
      if (grid[i][j].occupant == "W") {
        // define front face
        var fLX = ((i / 50) * 2) - 1; // front left X coord
        var fRX = fLX + .04; // front right X coord
        var fTY = (((j/ 50) * 2) - 1) * -1; // front top Y coord -- flip y
        var fBY = fTY - .04; // front bottom Y coord
        var fZ = -.02; // front Z coord
        var bZ = .04; // back Z coord

        cubeCoordArray = cubeCoordArray.concat([
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
        ]);
        colors = colors.concat([
          1, 1, 1, 1,
          2, 2, 2, 2,
          2, 2, 2, 2,
          2, 2, 2, 2,
          2, 2, 2, 2,
          2, 2, 2, 2
        ]);
        var l = incs;
        indices = indices.concat([
          l + 0,  l + 1,  l + 2,      l + 0,  l + 2,  l + 3,    // front
          l + 4,  l + 5,  l + 6,      l + 4,  l + 6,  l + 7,    // back
          l + 8,  l + 9,  l + 10,     l + 8,  l + 10, l + 11,   // top
          l + 12, l + 13, l + 14,     l + 12, l + 14, l + 15,   // bottom
          l + 16, l + 17, l + 18,     l + 16, l + 18, l + 19,   // right
          l + 20, l + 21, l + 22,     l + 20, l + 22, l + 23    // left
        ]);
        incs += 24;

      }

      if (grid[i][j].occupant == "H"  || grid[i][j].occupant == "T") {
        // define front face
        var fLX = ((i / 50) * 2) - 1; // front left X coord
        var fRX = fLX + .04; // front right X coord
        var fTY = ((((j)/ 50) * 2) - 1) * -1; // front top Y coord -- flip y
        var fBY = fTY - .04; // front bottom Y coord
        var fZ = -.02; // front Z coord
        var bZ = .02; // back Z coord

        cubeCoordArray = cubeCoordArray.concat([
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
        ]);
        colors = colors.concat([
          3, 3, 3, 3,
          4, 4, 4, 4,
          4, 4, 4, 4,
          4, 4, 4, 4,
          4, 4, 4, 4,
          4, 4, 4, 4
        ]);
        var l = incs;
        indices = indices.concat([
          l + 0,  l + 1,  l + 2,      l + 0,  l + 2,  l + 3,    // front
          l + 4,  l + 5,  l + 6,      l + 4,  l + 6,  l + 7,    // back
          l + 8,  l + 9,  l + 10,     l + 8,  l + 10, l + 11,   // top
          l + 12, l + 13, l + 14,     l + 12, l + 14, l + 15,   // bottom
          l + 16, l + 17, l + 18,     l + 16, l + 18, l + 19,   // right
          l + 20, l + 21, l + 22,     l + 20, l + 22, l + 23    // left
        ]);
        incs += 24;

      }

      if (grid[i][j].occupant == "F") {
        // define front face
        var fLX = ((i / 50) * 2) - 1; // front left X coord
        var fRX = fLX + .04; // front right X coord
        var fTY = ((((j)/ 50) * 2) - 1) * -1; // front top Y coord -- flip y
        var fBY = fTY - .04; // front bottom Y coord
        var fZ = -.02; // front Z coord
        var bZ = .02; // back Z coord

        cubeCoordArray = cubeCoordArray.concat([
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
        ]);
        colors = colors.concat([
          6, 6, 6, 6,
          7, 7, 7, 7,
          7, 7, 7, 7,
          7, 7, 7, 7,
          7, 7, 7, 7,
          7, 7, 7, 7
        ]);
        var l = incs;
        indices = indices.concat([
          l + 0,  l + 1,  l + 2,      l + 0,  l + 2,  l + 3,    // front
          l + 4,  l + 5,  l + 6,      l + 4,  l + 6,  l + 7,    // back
          l + 8,  l + 9,  l + 10,     l + 8,  l + 10, l + 11,   // top
          l + 12, l + 13, l + 14,     l + 12, l + 14, l + 15,   // bottom
          l + 16, l + 17, l + 18,     l + 16, l + 18, l + 19,   // right
          l + 20, l + 21, l + 22,     l + 20, l + 22, l + 23    // left
        ]);
        incs += 24;

      }
    }
  }

  var floorLX = -1.0;
  var floorRX = 1.0;
  var floorTY = -1.0;
  var floorBY = 1.0;
  var floorZ = .02;

  cubeCoordArray = cubeCoordArray.concat([
    // Front face
    floorLX, floorBY, floorZ,
    floorLX, floorTY, floorZ,
    floorRX, floorTY, floorZ,
    floorRX, floorBY, floorZ,
  ]);
  colors = colors.concat([
    5, 5, 5, 5,
  ]);
  var l = incs;
  indices = indices.concat([
    l + 0,  l + 1,  l + 2,
    l + 0,  l + 2,  l + 3
  ]);
  incs += 4;

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

// render the loaded model
function renderTriangles() {

    // check user input and edit graph
    now = Date.now();
    var elapsed = now - then;

    // if enough time has elapsed, draw the next frame

    if (elapsed > fpsInterval) {

        // Get ready for next frame by setting then=now, but also adjust for your
        // specified fpsInterval not being a multiple of RAF's interval (16.7ms)
        then = now - (elapsed % fpsInterval);

        // Put your drawing code here
        updateGraph();
    }

    // draw graph
    updateBuffers();
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // clear frame/depth buffers

    // vertex buffer: activate and feed into vertex shader
    gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffer); // activate
    gl.vertexAttribPointer(vertexPositionAttrib,3,gl.FLOAT,false,0,0); // feed

    gl.bindBuffer(gl.ARRAY_BUFFER,colorBuffer);
    gl.vertexAttribPointer(vertexColorAttrib, 1, gl.FLOAT, false, 0,0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleBuffer);
    gl.drawElements(gl.TRIANGLES, triBufferSize, gl.UNSIGNED_SHORT, 0); // render
    window.requestAnimationFrame(renderTriangles);
} // end render triangles


/* MAIN -- HERE is where execution begins after window load */

function main() {

  setupWebGL(); // set up the webGL environment
  loadTriangles(); // load in the triangles from tri file
  setupShaders(); //setup the webGL shaders
  renderTriangles(); // draw the triangles using webGL

} // end main
