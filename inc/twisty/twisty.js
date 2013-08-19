/*
 * twisty.js
 * 
 * Started by Lucas Garron, July 22, 2011 at WSOH
 * Made classy by Jeremy Fleischman, October 7, 2011 during the flight to worlds
 * 
 */

var twistyjs = {};

(function() {

if(typeof(log) == "undefined") {
  log = function(s) {
    console.log(s);
  };
}

// This fixes https://github.com/lgarron/twisty.js/issues/3
if (!Function.prototype.bind) {
  Function.prototype.bind = function (oThis) {
    if (typeof this !== "function") {
      // closest thing possible to the ECMAScript 5 internal IsCallable function
      throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable");
    }

    var fSlice = Array.prototype.slice,
        aArgs = fSlice.call(arguments, 1), 
        fToBind = this, 
        fNOP = function () {},
        fBound = function () {
          return fToBind.apply(this instanceof fNOP
                                 ? this
                                 : oThis || window,
                               aArgs.concat(fSlice.call(arguments)));
        };

    fNOP.prototype = this.prototype;
    fBound.prototype = new fNOP();

    return fBound;
  };
}

if(typeof(assert) == "undefined") {
  // TODO - this is pretty lame, we could use something like stacktrace.js
  // to get some useful information here.
  assert = function(cond, str) {
    if(!cond) {
      if(str) {
        throw str;
      } else {
        throw "Assertion Error";
      }
    }
  };
}

/****************
 * 
 * Twisty Plugins
 *
 * Plugins register themselves by calling twistyjs.registerTwisty.
 * This lets plugins be defined in different files.
 * 
 */

var twisties = {};
twistyjs.registerTwisty = function(twistyName, twistyConstructor) {
  assert(!(twistyName in twisties));
  twisties[twistyName] = twistyConstructor;
};

twistyjs.TwistyScene = function() {
  // that=this is a Crockford convention for accessing "this" inside of methods.
  var that = this;

  var twisty = null;

  var moveProgress = null;
  var currentMove = null;
  var moveQueue = [];

  var camera, scene, renderer;
  var twistyCanvas;
  var cameraTheta = 0;

  var stats = null;

  /* http://tauday.com/ ;-) */
  Math.TAU = Math.PI*2;

  /*
   * Initialization Methods
   */
  var twistyContainer = $('<div/>');
  twistyContainer.css('width', '100%');
  twistyContainer.css('height', '100%');
  twistyContainer = twistyContainer[0];

  this.getDomElement = function() {
    return twistyContainer;
  };
  this.getCanvas = function() {
    return twistyCanvas;
  };
  this.getTwisty = function() {
    return twisty;
  };

  this.initializeTwisty = function(twistyType) {
    moveQueue = [];
    currentMove = null;
    moveProgress = 0;
    // We may have an animation queued up that is tied to the twistyCanvas.
    // Since we're about to destroy our twistyCanvas, that animation request
    // will never fire. Thus, we must explicitly stop animating here.
    stopAnimation();

    $(twistyContainer).empty();
    log("Canvas Size: " + $(twistyContainer).width() + " x " + $(twistyContainer).height());

    /*
     * Scene Setup
     */

    scene = new THREE.Scene();

    /*
     * 3D Object Creation
     */

    // TODO: Rename and spec twisty format.
    twisty = createTwisty(twistyType);
    scene.add(twisty["3d"]);

    /*
     * Go!
     */

    renderer = new THREE.CanvasRenderer();
    twistyCanvas = renderer.domElement;

    twistyContainer.appendChild(twistyCanvas);


    //TODO: figure out keybindings, shortcuts, touches, and mouse presses.
    //TODO: 20110905 bug: after pressing esc, cube dragging doesn't work.

    if(twistyType.allowDragging) {
      $(twistyContainer).css('cursor', 'move');
      twistyContainer.addEventListener( 'mousedown', onMouseDown, false );
      twistyContainer.addEventListener( 'touchstart', onTouchStart, false );
      twistyContainer.addEventListener( 'touchmove', onTouchMove, false );
    }


    if(twistyType.showFps) {
      startStats();
    }
    // resize creates the camera and calls render()
    that.resize();
  }

  this.resize = function() {
    // This function should be called after setting twistyContainer
    // to the desired size.
    var min = Math.min($(twistyContainer).width(), $(twistyContainer).height());
    camera = new THREE.PerspectiveCamera( 30, 1, 0, 1000 );
    renderer.setSize(min, min);
    $(twistyCanvas).css('position', 'absolute');
    $(twistyCanvas).css('top', ($(twistyContainer).height()-min)/2);
    $(twistyCanvas).css('left', ($(twistyContainer).width()-min)/2);

    render();
  };

  this.keydown = function(e) {
    var keyCode = e.keyCode;
    //log(keyCode);
    twisty.keydownCallback(twisty, e);

    switch (keyCode) {

      case 37:
        moveCameraDelta(Math.TAU/48);
        e.preventDefault();
        break;

      case 39:
        moveCameraDelta(-Math.TAU/48);
        e.preventDefault();
        break;

    }
  };



  var theta = 0;
  var mouseXLast = 0;

  this.cam = function(deltaTheta) {
    theta += deltaTheta;
    moveCamera(theta);
  }

  var rotating = false;

  function onMouseDown( event ) {
    console.log(event);
    event.preventDefault();
    rotating = true;
    mouseXLast = event.clientX;
  }

  function onMouseMove( event ) {
    if (rotating) {
      mouseX = event.clientX;
      that.cam((mouseXLast - mouseX)/256);
      mouseXLast = mouseX;
    }
  }

  function onMouseUp( event ) {
    rotating = false;
  }

  document.body.addEventListener( 'mousemove', onMouseMove, false );
  document.body.addEventListener( 'mouseup', onMouseUp, false );

  function onTouchStart( event ) {
    if ( event.touches.length == 1 ) {
      event.preventDefault();
      mouseXLast = event.touches[0].pageX;
    }
  }

  function onTouchMove( event ) {
    if ( event.touches.length == 1 ) {
      event.preventDefault();
      mouseX = event.touches[0].pageX;
      that.cam((mouseXLast - mouseX)/256);
      mouseXLast = mouseX;
    }
  }



  function render() {
    renderer.render(scene, camera);
  }

  function moveCameraPure(theta) {
    cameraTheta = theta;
    camera.position.x = 2.5*Math.sin(theta)
    camera.position.y = 2
    camera.position.z = 2.5*Math.cos(theta);
    camera.lookAt(new THREE.Vector3(0, 0, 0));
  }

  function moveCameraDelta(deltaTheta) {
    cameraTheta += deltaTheta;
    moveCameraPure(cameraTheta);
    render();
  }

  function moveCamera(theta) {
    moveCameraPure(theta);
    render();
  }

  var moveListeners = [];
  this.addMoveListener = function(listener) {
    moveListeners.push(listener);
  };
  this.removeMoveListener = function(listener) {
    var index = moveListeners.indexOf(listener);
    assert(index >= 0);
    delete moveListeners[index];
  };
  function fireMoveStarted(move) {
    for(var i = 0; i < moveListeners.length; i++) {
      moveListeners[i](move, true);
    }
  }
  function fireMoveEnded(move) {
    for(var i = 0; i < moveListeners.length; i++) {
      moveListeners[i](move, false);
    }
  }

  function startMove() {
    moveProgress = 0;

    currentMove = moveQueue.shift();
    //log(moveToString(currentMove));
    fireMoveStarted(currentMove);
  }

  //TODO 20110906: Handle illegal moves robustly.
  function queueMoves(moves) {
    moveQueue = moveQueue.concat(moves);
    if (moveQueue.length > 0) {
      startAnimation();
    }
  }
  this.animateMoves = function(moves) {
    animationStep = 0.1;
    queueMoves(moves);
  };

  this.addMoves = function(moves) {
    queueMoves(moves);
    updateSpeed();
  };


  this.applyMoves = function(moves) {
    moveQueue = moves;
    while (moveQueue.length > 0) {
      startMove();
      twisty["advanceMoveCallback"](twisty, currentMove);
    }
    render();
  };

  //TODO: Make time-based / framerate-compensating
  function updateSpeed() {
    animationStep = Math.min(0.15 + 0.1*moveQueue.length, 1);
  }

  var animationStep = 0.1;

  function stepAnimation() {
    moveProgress += animationStep;

    if (moveProgress < 1) {
      twisty["animateMoveCallback"](twisty, currentMove, moveProgress);
    }
    else {
      twisty["advanceMoveCallback"](twisty, currentMove);

      fireMoveEnded(currentMove);
      currentMove = null;

      if (moveQueue.length == 0) {
        stopAnimation();
      }
      else {
        startMove();
      }

    }
  }

  function startStats() {
    stats = new Stats();
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.top = '0px';
    stats.domElement.style.left = '0px';
    twistyContainer.appendChild( stats.domElement );
    $(stats.domElement).click();
  }


  var pendingAnimationLoop = null;
  function stopAnimation() {
    if(pendingAnimationLoop !== null) {
      cancelRequestAnimFrame(pendingAnimationLoop);
      pendingAnimationLoop = null;
    }
  }
  function startAnimation() {
    if(pendingAnimationLoop === null) {
      //log("Starting move queue: " + movesToString(moveQueue));
      startMove();
      pendingAnimationLoop = requestAnimFrame(animateLoop, twistyCanvas);
    }
  }
  function animateLoop() {
    stepAnimation();
    render();

    if (stats) {
      stats.update(); 
    }

    // That was fun, lets do it again!
    // We check pendingAnimationLoop first, because the loop
    // may have been cancelled during stepAnimation().
    if(pendingAnimationLoop !== null) {
      pendingAnimationLoop = requestAnimFrame(animateLoop, twistyCanvas);
    }
  }

  function createTwisty(twistyType) {
    var twistyCreateFunction = twisties[twistyType.type];
    if(!twistyCreateFunction) {
      err('Twisty type "' + twistyType.type + '" is not recognized!');
      return null;
    }

    // TODO - discuss the class heirarchy with Lucas
    //  Does it make sense for a TwistyScene to have an addMoves method?
    //  Scene implies (potentially) multiple twisties.
    //   Perhaps rename TwistyScene -> TwistyContainer?
    //  Alertatively, TwistyScene could become a Twisty base class, 
    //  and twisty instances inherit useful stuff like addMoves.
    //
    //  I personally prefer the first method for a couple of reasons:
    //   1. Classical inheritance in javascript is funky. This isn't a good
    //      reson to not do it, just personal preference.
    //   2. Creating a new twisty doesn't force recreation of the TwistyScene.
    //      Maybe this isn't an important case to optimize for, but to me
    //      it's evidence that having a persistent TwistyScene is the right
    //      way to go.
    return twistyCreateFunction(that, twistyType);
  }

};

})();