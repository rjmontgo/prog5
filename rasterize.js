var gl; // the gl object

var grid; // stores the state of the grid

var triangleBuffer;
var vertexPosBuffer;
var vertexColBuffer;

var vertexPositionAttrib; // location of vertex attribute
var vertexColorAttrib; // location of vertex colors


function setupWebGL() {
  var webGlCanvas = document.getElementById("webGLCanvas");
  gl = webGlCanvas.getContext("webgl");
  
  try {
    if (gl == null) {
      throw "unable to load webgl -- does your browser support it?";
    } else {
      gl.clearColor(0.0, 0.0, 0.0, 1.0);
      gl.clearDepth(1.0);
      gl.enable(gl.DEPTH_TEST);
    }
  } catch (e) {
    console.log(e);
  }
}

function loadHeadCube() {
  grid = new Array(50);
  for (var i = 0; i < grid.length; i++) {
    grid[i] = new Array(50);
  }
  
  const positions = [
  // Front face
  -1.0, -1.0,  1.0,
   1.0, -1.0,  1.0,
   1.0,  1.0,  1.0,
  -1.0,  1.0,  1.0,
  
  // Back face
  -1.0, -1.0, -1.0,
  -1.0,  1.0, -1.0,
   1.0,  1.0, -1.0,
   1.0, -1.0, -1.0,
  
  // Top face
  -1.0,  1.0, -1.0,
  -1.0,  1.0,  1.0,
   1.0,  1.0,  1.0,
   1.0,  1.0, -1.0,
  
  // Bottom face
  -1.0, -1.0, -1.0,
   1.0, -1.0, -1.0,
   1.0, -1.0,  1.0,
  -1.0, -1.0,  1.0,
  
  // Right face
   1.0, -1.0, -1.0,
   1.0,  1.0, -1.0,
   1.0,  1.0,  1.0,
   1.0, -1.0,  1.0,
  
  // Left face
  -1.0, -1.0, -1.0,
  -1.0, -1.0,  1.0,
  -1.0,  1.0,  1.0,
  -1.0,  1.0, -1.0,
];
  
  const faceColors = [
    [1.0,  1.0,  1.0,  1.0],    // Front face: white
    [1.0,  0.0,  0.0,  1.0],    // Back face: red
    [0.0,  1.0,  0.0,  1.0],    // Top face: green
    [0.0,  0.0,  1.0,  1.0],    // Bottom face: blue
    [1.0,  1.0,  0.0,  1.0],    // Right face: yellow
    [1.0,  0.0,  1.0,  1.0],    // Left face: purple
  ];

  // Convert the array of colors into a table for all the vertices.

  var colors = [];

  for (var j = 0; j < faceColors.length; ++j) {
    const c = faceColors[j];

    // Repeat each color four times for the four vertices of the face
    colors = colors.concat(c, c, c, c);
  }
  
  const indices = [
    0,  1,  2,      0,  2,  3,    // front
    4,  5,  6,      4,  6,  7,    // back
    8,  9,  10,     8,  10, 11,   // top
    12, 13, 14,     12, 14, 15,   // bottom
    16, 17, 18,     16, 18, 19,   // right
    20, 21, 22,     20, 22, 23,   // left
  ];
  
  triangleBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Float32Array(indices), gl.STATIC_DRAW);
  
  vertexColBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexColBuffer );
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
  
  vertexPosBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexPosBuffer );
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
  
}

function setupShaders() {
  var fShaderCode = `
    varying lowp vec4 vColor;
    
    void main() {
      gl_FragColor = vColor;
    }`;
  
  var vShaderCode = `
    attribute vec3 vertexPos;
    attribute vec4 vertexCol;

    varying lowp vec4 vColor;

    void main() {
      gl_Position = vec4(vertexPos, 1.0);
      vColor = vertexCol;
    }`;
  
  try {
    var fShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fShader, fShaderCode);
    gl.compileShader(fShader);
    
    var vShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vShader, vShaderCode);
    gl.compileShader(vShader);
    
    if (!gl.getShaderParameter(fShader, gl.COMPILE_STATUS)) {
      throw "Error during fragment shader compile -- " + gl.getShaderInfoLog(fShader);
      gl.deleteShader(fShader);
    } else if (!gl.getShaderParameter(vShader, gl.COMPILE_STATUS)) {
      throw "Error during vertex shader compile -- " + gl.getShaderInfoLog(vShader);
      gl.deleteShader(vShader);
    } else {
      var shaderProgram = gl.createProgram();
      gl.attachShader(shaderProgram, fShader);
      gl.attachShader(shaderProgram, vShader);
      gl.linkProgram(shaderProgram);
      
      if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        throw "Error during program linkage -- " + gl.getProgramInfoLog(shaderProgram);
      } else {
        gl.useProgram(shaderProgram);
        
        vertexPositionAttrib = gl.getAttribLocation(shaderProgram, "vertexPos");
        gl.enableVertexAttribArray(vertexPositionAttrib);
        
        vertexColorAttrib = gl.getAttribLocation(shaderProgram, "vertexCol");
        gl.enableVertexAttribArray(vertexColorAttrib);
      }
    }
  } catch (e) {
    console.log(e);
  }
}

function render() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
  // bind buffers
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexPosBuffer);
  gl.vertexAttribPointer(vertexPositionAttrib, 3, gl.FLOAT, false, 0, 0);
  
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexColBuffer);
  gl.vertexAttribPointer(vertexColorAttrib, 4, gl.FLOAT, false, 0, 0);
  
  // drawElements
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleBuffer);
  gl.drawElements(gl.TRIANGLES, 12, gl.UNSIGNED_SHORT, 0);
}
/*
 * Initializes the program
*/
function main() {
  setupWebGL();
  loadHeadCube();
  setupShaders();
  render();
}