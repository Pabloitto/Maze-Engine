(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"C:\\Maze-Engine\\client\\app\\app.js":[function(require,module,exports){
(function(){

	"use strict";

	var main = null,
		Maze = require("../app/core/maze"),
		Config = require("../app/core/config-maze"),
		UserInteraction = require("../app/core/user-interaction"),
		MouseEventListener = require("../app/core/mouse-event-listener"),
		interaction = null,
		mouseX = 0,
		mouseY = 0;

	function Main(){}

	Main.prototype = {
		editor : null,
		maze : null,
		canvas : null,
		context : null,
		init : function(){
			this.getInitialSize();
			this.initEditor();
			this.canvas = document.querySelector(".main-canvas");
			this.context = this.canvas.getContext("2d");

			this.canvas.width = Config.WIDTH * Config.CELL_SIZE;
			this.canvas.height = Config.HEIGHT * Config.CELL_SIZE;

			this.fetchMazeAndDraw().then(function(){
				this.update();
			}.bind(this));

			this.bindEvents();
		},
		getInitialSize : function(){
			Config.WIDTH = Math.floor(10 + (Math.random() * 20));
			Config.HEIGHT = Config.WIDTH;
		},
		update : function(){
			this.draw();
			requestAnimationFrame(this.update.bind(this));
		},
		fetchMazeAndDraw:function(){
			return this.fetchMaze().then(function(cells){
				this.maze = new Maze({
					width : Config.WIDTH,
					height : Config.HEIGHT,
					cells : cells
				});
				interaction = new UserInteraction({
					end : this.maze.getEndNode(),
					cell : cells[0][0]
				});
			}.bind(this));
		},
		bindEvents : function(){
			var btnDrawSolution = document.getElementById("input-draw-solution"),
				btnNewMaze = document.getElementById("input-new-maze");
			
			btnDrawSolution.addEventListener("click",this.handleClickDrawSolution.bind(this),false);
			btnNewMaze.addEventListener("click",this.handleClickNewMaze.bind(this),false);

			this.editor.on("change", function(){
				var code = this.editor.getSession().getValue();
				localStorage.setItem("code",code);
			}.bind(this));
		},
		handleClickNewMaze : function(){
			this.getInitialSize();
			this.canvas.width = Config.WIDTH * Config.CELL_SIZE;
			this.canvas.height = Config.HEIGHT * Config.CELL_SIZE;
			this.maze.width = Config.width;
			this.maze.height = Config.height;
			this.fetchMazeAndDraw();
		},
		handleClickDrawSolution : function(){
			var codeSolution = this.editor.getSession().getValue();
			var run = eval(codeSolution);
			
			this.initInteraction();	
			interaction.execute(run.bind(interaction));
		},
		initEditor : function(){
			var code = localStorage.getItem("code");

			this.editor = ace.edit("editor");
		    this.editor.setTheme("ace/theme/monokai");
		    this.editor.getSession().setMode("ace/mode/javascript");

		    if(code){
				this.editor.getSession().setValue(code, 1);
			}
		},
		initInteraction : function(){
			var initialNode = this.maze.cells[0][0];
			interaction.init({
				end : this.maze.getEndNode(),
				cells : this.maze.cells,
				cell : {
					x : initialNode.x,
					y : initialNode.y,
					width : initialNode.width,
					height : initialNode.height,
					walls : {
						right : initialNode.walls.right,
						left : initialNode.walls.left,
						top : initialNode.walls.top,
						bottom : initialNode.walls.bottom
					}
				}
			});
		},
		draw : function(){
			this.context.clearRect(0,0,this.canvas.width,this.canvas.height);
			this.maze.draw(this.context);
			var toPaint = interaction.getToPaint();
			if(toPaint.length > 0){
				var index = toPaint.length - 2;
				var currentNode = index < 0 ? {move : this.maze.cells[0][0]} : toPaint[index];
				var nextNode = toPaint[toPaint.length - 1];
				var finalNode = this.maze.getEndNode();
				if(!this.maze.isInvalidMove(currentNode.move,nextNode.move)){
					if(finalNode.x === nextNode.move.x && finalNode.y === nextNode.move.y){
						nextNode.direction = null;
					}
					this.maze.drawSprite(this.context,{
						image : 'hero'
					}, nextNode);
				}else {
					this.initInteraction();
				}
			}else{
				this.maze.drawSprite(this.context,{
						image : 'hero'
					}, {
						move : this.maze.cells[0][0],
					});
			}
		},
		fetchMaze : function(){
			return fetch("/api/v1/maze?width="+Config.WIDTH+"&height="+Config.HEIGHT,{
				method: 'GET', 
				headers: new Headers({
					'Content-Type': 'application/json'
				})
			}).then(function(response){
				return response.json();
			});
		},
		fetchMazeSolution : function(data){
			return fetch("/api/v1/maze/solution",{
				method: 'POST', 
				body : JSON.stringify(data),
				headers: new Headers({
					'Content-Type': 'application/json'
				})
			}).then(function(response){
				return response.json();
			});
		},
	};

	main = new Main();

	window.onload = main.init.bind(main);

}());
},{"../app/core/config-maze":"C:\\Maze-Engine\\client\\app\\core\\config-maze.js","../app/core/maze":"C:\\Maze-Engine\\client\\app\\core\\maze.js","../app/core/mouse-event-listener":"C:\\Maze-Engine\\client\\app\\core\\mouse-event-listener.js","../app/core/user-interaction":"C:\\Maze-Engine\\client\\app\\core\\user-interaction.js"}],"C:\\Maze-Engine\\client\\app\\core\\cell.js":[function(require,module,exports){
module.exports = (function(){

	var Wall = require("./wall"),
		Config = require("./config-maze");

	function Cell(rawCell){
		this.walls = {
			left : null,
			right : null,
			top : null,
			bottom : null
		};
		this.init(rawCell);
	}

	Cell.prototype = {
		names : ["left","right","top","bottom"],
		x : 0,
		y : 0,
		width : Config.CELL_SIZE,
		height : Config.CELL_SIZE,
		visited : false,
		walls : {
			left : null,
			right : null,
			top : null,
			bottom : null
		},
		init : function(props){
			this.x = props.x;
			this.y = props.y;
			this.width = props.width;
			this.height = props.height;
			this.createWalls(props.walls);
		},
		createWalls : function(props){
			var self = this;
			for(var p in props){
				var obj = props[p];
				if(!obj){
					this.walls[p] = null;
				}else{
					this.walls[p] = new Wall({
						name : p,
						x : obj.x,
						y : obj.y,
						height : obj.height,
						width : obj.width
					});
				}
			}
		},
		draw : function(context){
			this.names.forEach(function(name){
				var wall = this.walls[name];
				if(wall){
					wall.draw(context);
				}
			},this);
		}
	};

	return Cell;

}());
},{"./config-maze":"C:\\Maze-Engine\\client\\app\\core\\config-maze.js","./wall":"C:\\Maze-Engine\\client\\app\\core\\wall.js"}],"C:\\Maze-Engine\\client\\app\\core\\config-maze.js":[function(require,module,exports){
module.exports = {
	CELL_SIZE : 20,
	WIDTH :20,
	HEIGHT : 20
};
},{}],"C:\\Maze-Engine\\client\\app\\core\\images.js":[function(require,module,exports){
module.exports = (function(){

	function ImageFactory(){}

	var path = '/app/img/',
        ext = '.png',
        loaded={};
    
    ImageFactory.prototype = {
    	loadImage : function(name){
	        var image = null;
	        if(!loaded[name + ext]){
	            image = new Image();
	            /*image.onload = function(){
	            	
	            };*/
	            loaded[name + ext] = image;
	            image.src = path + name + ext;
	        }else{
	            image = loaded[name + ext];
	        }
	        return image;
	    },
	    getImage : function(name){
	        return loaded[name + ext];
	    }
    };

	return ImageFactory;

}());
},{}],"C:\\Maze-Engine\\client\\app\\core\\maze.js":[function(require,module,exports){
module.exports = (function(){

	var Cell = require("./cell");
	var ImageFactory = require("./images");
	var end = null;
	var defaultDirection = {
			direction : 'bottom',
			index : 0,
			positions : [
				{x : 0 ,y : 0},
		    	{x : 1 ,y : 0},
		    	{x : 2 ,y : 0}
		    ]
	};

	function Maze(props){
		ImageFactory = new ImageFactory();
		this.init(props);
	}

	Maze.prototype = {
		currentDirection : defaultDirection,
		width : 0,
		height : 0,
		cells : [],
		getEndNode : function(){
			return end;
		},
		init : function(props){
			ImageFactory.loadImage('hero');
			this.width = props.width;
			this.height = props.height;
			this.createCells(props.cells);
			end = this.getRandomPosition();
			setInterval(function(){
				this.currentDirection.index += 1;
				if(this.currentDirection.index === 3){
					this.currentDirection.index = 0;
				}
			}.bind(this), 1000 / 5);
		},
		createCells : function(rawCells){
			for (var i = 0; i < rawCells.length; i++) {
		        this.cells[i] = [];
		        for (var j = 0; j < rawCells[i].length; j++) {
		            this.cells[i][j] = new Cell(rawCells[i][j]);
		        }
		    }
		},
		draw : function(context){
			this.fillCell(context,this.cells[end.x][end.y], "red");
			this.cells.forEach(function (rows) {
				rows.forEach(function(cell){
					cell.draw(context);
				});
			});
		},
		isInvalidMove : function(currentNode,nextNode){

        	if(nextNode.x > currentNode.x && currentNode.walls.right){
        		return true;
        	}

        	if(nextNode.y < currentNode.y && currentNode.walls.top){
        		return true;
        	}

        	if(nextNode.y > currentNode.y && currentNode.walls.bottom){
        		return true;
        	}

        	if(nextNode.x < currentNode.x && currentNode.walls.left){
        		return true;
        	}
		},
		fillCell : function(context,cell,color){
			context.fillStyle = color;
			var x = (cell.x * cell.width) + 5;
			var y = (cell.y * cell.height) + 5;
			context.fillRect(x,y,cell.width / 2,cell.height / 2);
		},
		drawSprite : function(context,sprite,nextMove){
			var cell = nextMove.move;
			var x = cell.x * cell.width;
			var y = cell.y * cell.height;
			var image = ImageFactory.getImage(sprite.image);
			var positions = null;
			var pos = this.currentDirection.positions[0];

			if(nextMove.direction){
				positions = this.getSpritePosition(nextMove.direction);
				if(nextMove.direction !== this.currentDirection.direction){
					this.currentDirection.index = 0;
					this.currentDirection.direction = nextMove.direction;
					this.currentDirection.positions = positions;
				}
				pos = this.currentDirection.positions[this.currentDirection.index];
			}

			context.drawImage(image, 
				pos.x * cell.width, 
				pos.y * cell.height, 
				cell.width, 
				cell.height, 
				x, 
				y, 
				cell.width, 
				cell.height);
		},
		getSpritePosition : function(direction){
			var positions = [];
			switch(direction){
                case 'bottom': 
                positions = [
                	{x : 0 ,y : 0},
                	{x : 1 ,y : 0},
                	{x : 2 ,y : 0}
                ];  
                break;
                case 'right':  
	                positions = [
	                	{x : 3 ,y : 0},
	                	{x : 4 ,y : 0},
	                	{x : 5 ,y : 0}
	                ];
                break;
                case 'left': 
                	positions = [
	                	{x : 6 ,y : 0},
	                	{x : 7 ,y : 0},
	                	{x : 8 ,y : 0}
	                ];
                break;
                case 'top': 
                	positions = [
	                	{x : 9 ,y : 0},
	                	{x : 10 ,y : 0},
	                	{x : 11 ,y : 0}
	                ];
                break;
            }
            return positions;
		},
		clearCell : function(context,cell){
			var x = (cell.x * cell.width) + 5;
			var y = (cell.y * cell.height) + 5;
			context.clearRect(x,y,cell.width / 2,cell.height / 2);
		},
		getRandomPosition:function(){
			return {
				x : Math.floor(Math.random() * this.width),
        		y : Math.floor(Math.random() * this.height)
			}
		}
	};

	return Maze;

}());
},{"./cell":"C:\\Maze-Engine\\client\\app\\core\\cell.js","./images":"C:\\Maze-Engine\\client\\app\\core\\images.js"}],"C:\\Maze-Engine\\client\\app\\core\\mouse-event-listener.js":[function(require,module,exports){
module.exports=(function(){

	var onMouseMoveCallBack;

	function MouseEventListener(props){
		this.init(props);
	}

	function getMousePos(element, evt) {
        var rect = element.getBoundingClientRect();
        return {
          x: evt.clientX - rect.left,
          y: evt.clientY - rect.top
        };
      }

	MouseEventListener.prototype = {
			element : null,
		    init : function(props){
		    	this.element = props.element;
		    	onMouseMoveCallBack = props.onMouseMove || function(){};
		        this.bindEvents();
		    },
		    bindEvents : function(){
		        this.element.addEventListener('mousemove',function(e){
		        	this.onMouseMove(e,this.element);
		        }.bind(this),false);
		    },
		    onMouseMove : function(e,element){
				var position = getMousePos(element,e);
				onMouseMoveCallBack(position.x,position.y);
			}
	};
    

	return MouseEventListener;

}());
},{}],"C:\\Maze-Engine\\client\\app\\core\\user-interaction.js":[function(require,module,exports){
module.exports = (function(){

	var cells = [],
		end = null, 
		cell = null, 
		moves = [],
		toBePaint = [],
		movePromises = [],
		context,
		fps = 1000 / 5;

	function UserInteraction(props){
		this.init(props);
	}

	UserInteraction.prototype = {
		x : 0,
		y : 0,
		getMoves : function(){
			return moves;
		},
		getToPaint : function(){
			return toBePaint;
		},
		init : function(props){
			cell = props.cell;
			end = props.end;
			cells = props.cells;
			moves = [];
			toBePaint = [];
			movePromises.forEach(function(promise){
				clearTimeout(promise);
			});
			this.x = 0;
			this.y = 0;
		},
		isComplete : function(){
			return cell.x === end.x && cell.y === end.y;
		},
		moveTo : function(direction){
			var nextMove = this.getNextMove(direction);
			moves.push(nextMove);
			movePromises.push(setTimeout(function(){
				toBePaint.push({
					move : nextMove,
					direction : direction
				});
			}.bind(this), moves.length * fps));
			return nextMove;
		},
		canMoveTo : function(direction){
			var lastMove = moves[moves.length - 1] || this.getSingleMove();
			return lastMove.walls[direction] === null;
		},
		getNextMove : function(direction){

			switch(direction){
				case 'left' : 
				cell.x-=1;
				break;
				case 'right' : 
				cell.x += 1;
				break;
				case 'bottom' : 
				cell.y += 1;
				break;
				case 'top' : 
				cell.y -= 1;
				break;
			}

			var result = this.getSingleMove();

			this.x = result.x;
			this.y = result.y;

			return result;
			
		},
		getSingleMove : function(){
			var initialNode = cells[cell.x][cell.y];

			return {
				x : initialNode.x,
				y : initialNode.y,
				width : initialNode.width,
				height : initialNode.height,
				walls : {
					right : initialNode.walls.right,
					left : initialNode.walls.left,
					top : initialNode.walls.top,
					bottom : initialNode.walls.bottom
				}
			};
		},
		execute : function(runFunction){
			if(runFunction && typeof runFunction === "function"){
				runFunction();
				console.log(moves.length);
			}
		},
	};


	return UserInteraction;

}());
},{}],"C:\\Maze-Engine\\client\\app\\core\\wall.js":[function(require,module,exports){
module.exports = (function(){

	function Wall(props){
		this.name = props.name;
		this.color = props.color || this.color;
		this.x = props.x;
		this.y = props.y;
		this.width = props.width;
		this.height = props.height;
	}

	Wall.prototype = {
		x : 0,
		y : 0,
		height : 0,
		width : 0,
		name : "",
		color : "gray",
		draw : function(context){
			this[this.name](context);
		},
		left:function(context){
			context.strokeStyle = this.color;
			context.beginPath();
			context.moveTo(this.x * this.width,this.y * this.height);
			context.lineTo(this.x * this.width,(this.y + 1) * this.height);
			context.stroke();
		},
		right:function(context){
			context.strokeStyle = this.color;
			context.beginPath();
			context.moveTo((this.x * this.width) + this.width,this.y * this.height);
			context.lineTo((this.x + 1) * this.width, (this.y + 1) * this.height);
			context.stroke();
		},
		top : function(context){
			context.strokeStyle = this.color;
			context.beginPath();
			context.moveTo(this.x * this.width,this.y * this.height);
			context.lineTo((this.x * this.width) + this.width,this.y * this.height);
			context.stroke();	
		},
		bottom : function(context){
			context.strokeStyle = this.color;
			context.beginPath();
			context.moveTo(this.x * this.width,(this.y * this.height) + this.height);
			context.lineTo((this.x * this.width) + this.width,(this.y + 1) * this.height);
			context.stroke();
		}
	};

	return Wall;

}());
},{}]},{},["C:\\Maze-Engine\\client\\app\\app.js"])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJjbGllbnQvYXBwL2FwcC5qcyIsImNsaWVudC9hcHAvY29yZS9jZWxsLmpzIiwiY2xpZW50L2FwcC9jb3JlL2NvbmZpZy1tYXplLmpzIiwiY2xpZW50L2FwcC9jb3JlL2ltYWdlcy5qcyIsImNsaWVudC9hcHAvY29yZS9tYXplLmpzIiwiY2xpZW50L2FwcC9jb3JlL21vdXNlLWV2ZW50LWxpc3RlbmVyLmpzIiwiY2xpZW50L2FwcC9jb3JlL3VzZXItaW50ZXJhY3Rpb24uanMiLCJjbGllbnQvYXBwL2NvcmUvd2FsbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiKGZ1bmN0aW9uKCl7XHJcblxyXG5cdFwidXNlIHN0cmljdFwiO1xyXG5cclxuXHR2YXIgbWFpbiA9IG51bGwsXHJcblx0XHRNYXplID0gcmVxdWlyZShcIi4uL2FwcC9jb3JlL21hemVcIiksXHJcblx0XHRDb25maWcgPSByZXF1aXJlKFwiLi4vYXBwL2NvcmUvY29uZmlnLW1hemVcIiksXHJcblx0XHRVc2VySW50ZXJhY3Rpb24gPSByZXF1aXJlKFwiLi4vYXBwL2NvcmUvdXNlci1pbnRlcmFjdGlvblwiKSxcclxuXHRcdE1vdXNlRXZlbnRMaXN0ZW5lciA9IHJlcXVpcmUoXCIuLi9hcHAvY29yZS9tb3VzZS1ldmVudC1saXN0ZW5lclwiKSxcclxuXHRcdGludGVyYWN0aW9uID0gbnVsbCxcclxuXHRcdG1vdXNlWCA9IDAsXHJcblx0XHRtb3VzZVkgPSAwO1xyXG5cclxuXHRmdW5jdGlvbiBNYWluKCl7fVxyXG5cclxuXHRNYWluLnByb3RvdHlwZSA9IHtcclxuXHRcdGVkaXRvciA6IG51bGwsXHJcblx0XHRtYXplIDogbnVsbCxcclxuXHRcdGNhbnZhcyA6IG51bGwsXHJcblx0XHRjb250ZXh0IDogbnVsbCxcclxuXHRcdGluaXQgOiBmdW5jdGlvbigpe1xyXG5cdFx0XHR0aGlzLmdldEluaXRpYWxTaXplKCk7XHJcblx0XHRcdHRoaXMuaW5pdEVkaXRvcigpO1xyXG5cdFx0XHR0aGlzLmNhbnZhcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIubWFpbi1jYW52YXNcIik7XHJcblx0XHRcdHRoaXMuY29udGV4dCA9IHRoaXMuY2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcclxuXHJcblx0XHRcdHRoaXMuY2FudmFzLndpZHRoID0gQ29uZmlnLldJRFRIICogQ29uZmlnLkNFTExfU0laRTtcclxuXHRcdFx0dGhpcy5jYW52YXMuaGVpZ2h0ID0gQ29uZmlnLkhFSUdIVCAqIENvbmZpZy5DRUxMX1NJWkU7XHJcblxyXG5cdFx0XHR0aGlzLmZldGNoTWF6ZUFuZERyYXcoKS50aGVuKGZ1bmN0aW9uKCl7XHJcblx0XHRcdFx0dGhpcy51cGRhdGUoKTtcclxuXHRcdFx0fS5iaW5kKHRoaXMpKTtcclxuXHJcblx0XHRcdHRoaXMuYmluZEV2ZW50cygpO1xyXG5cdFx0fSxcclxuXHRcdGdldEluaXRpYWxTaXplIDogZnVuY3Rpb24oKXtcclxuXHRcdFx0Q29uZmlnLldJRFRIID0gTWF0aC5mbG9vcigxMCArIChNYXRoLnJhbmRvbSgpICogMjApKTtcclxuXHRcdFx0Q29uZmlnLkhFSUdIVCA9IENvbmZpZy5XSURUSDtcclxuXHRcdH0sXHJcblx0XHR1cGRhdGUgOiBmdW5jdGlvbigpe1xyXG5cdFx0XHR0aGlzLmRyYXcoKTtcclxuXHRcdFx0cmVxdWVzdEFuaW1hdGlvbkZyYW1lKHRoaXMudXBkYXRlLmJpbmQodGhpcykpO1xyXG5cdFx0fSxcclxuXHRcdGZldGNoTWF6ZUFuZERyYXc6ZnVuY3Rpb24oKXtcclxuXHRcdFx0cmV0dXJuIHRoaXMuZmV0Y2hNYXplKCkudGhlbihmdW5jdGlvbihjZWxscyl7XHJcblx0XHRcdFx0dGhpcy5tYXplID0gbmV3IE1hemUoe1xyXG5cdFx0XHRcdFx0d2lkdGggOiBDb25maWcuV0lEVEgsXHJcblx0XHRcdFx0XHRoZWlnaHQgOiBDb25maWcuSEVJR0hULFxyXG5cdFx0XHRcdFx0Y2VsbHMgOiBjZWxsc1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHRcdGludGVyYWN0aW9uID0gbmV3IFVzZXJJbnRlcmFjdGlvbih7XHJcblx0XHRcdFx0XHRlbmQgOiB0aGlzLm1hemUuZ2V0RW5kTm9kZSgpLFxyXG5cdFx0XHRcdFx0Y2VsbCA6IGNlbGxzWzBdWzBdXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0uYmluZCh0aGlzKSk7XHJcblx0XHR9LFxyXG5cdFx0YmluZEV2ZW50cyA6IGZ1bmN0aW9uKCl7XHJcblx0XHRcdHZhciBidG5EcmF3U29sdXRpb24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImlucHV0LWRyYXctc29sdXRpb25cIiksXHJcblx0XHRcdFx0YnRuTmV3TWF6ZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiaW5wdXQtbmV3LW1hemVcIik7XHJcblx0XHRcdFxyXG5cdFx0XHRidG5EcmF3U29sdXRpb24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsdGhpcy5oYW5kbGVDbGlja0RyYXdTb2x1dGlvbi5iaW5kKHRoaXMpLGZhbHNlKTtcclxuXHRcdFx0YnRuTmV3TWF6ZS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIix0aGlzLmhhbmRsZUNsaWNrTmV3TWF6ZS5iaW5kKHRoaXMpLGZhbHNlKTtcclxuXHJcblx0XHRcdHRoaXMuZWRpdG9yLm9uKFwiY2hhbmdlXCIsIGZ1bmN0aW9uKCl7XHJcblx0XHRcdFx0dmFyIGNvZGUgPSB0aGlzLmVkaXRvci5nZXRTZXNzaW9uKCkuZ2V0VmFsdWUoKTtcclxuXHRcdFx0XHRsb2NhbFN0b3JhZ2Uuc2V0SXRlbShcImNvZGVcIixjb2RlKTtcclxuXHRcdFx0fS5iaW5kKHRoaXMpKTtcclxuXHRcdH0sXHJcblx0XHRoYW5kbGVDbGlja05ld01hemUgOiBmdW5jdGlvbigpe1xyXG5cdFx0XHR0aGlzLmdldEluaXRpYWxTaXplKCk7XHJcblx0XHRcdHRoaXMuY2FudmFzLndpZHRoID0gQ29uZmlnLldJRFRIICogQ29uZmlnLkNFTExfU0laRTtcclxuXHRcdFx0dGhpcy5jYW52YXMuaGVpZ2h0ID0gQ29uZmlnLkhFSUdIVCAqIENvbmZpZy5DRUxMX1NJWkU7XHJcblx0XHRcdHRoaXMubWF6ZS53aWR0aCA9IENvbmZpZy53aWR0aDtcclxuXHRcdFx0dGhpcy5tYXplLmhlaWdodCA9IENvbmZpZy5oZWlnaHQ7XHJcblx0XHRcdHRoaXMuZmV0Y2hNYXplQW5kRHJhdygpO1xyXG5cdFx0fSxcclxuXHRcdGhhbmRsZUNsaWNrRHJhd1NvbHV0aW9uIDogZnVuY3Rpb24oKXtcclxuXHRcdFx0dmFyIGNvZGVTb2x1dGlvbiA9IHRoaXMuZWRpdG9yLmdldFNlc3Npb24oKS5nZXRWYWx1ZSgpO1xyXG5cdFx0XHR2YXIgcnVuID0gZXZhbChjb2RlU29sdXRpb24pO1xyXG5cdFx0XHRcclxuXHRcdFx0dGhpcy5pbml0SW50ZXJhY3Rpb24oKTtcdFxyXG5cdFx0XHRpbnRlcmFjdGlvbi5leGVjdXRlKHJ1bi5iaW5kKGludGVyYWN0aW9uKSk7XHJcblx0XHR9LFxyXG5cdFx0aW5pdEVkaXRvciA6IGZ1bmN0aW9uKCl7XHJcblx0XHRcdHZhciBjb2RlID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oXCJjb2RlXCIpO1xyXG5cclxuXHRcdFx0dGhpcy5lZGl0b3IgPSBhY2UuZWRpdChcImVkaXRvclwiKTtcclxuXHRcdCAgICB0aGlzLmVkaXRvci5zZXRUaGVtZShcImFjZS90aGVtZS9tb25va2FpXCIpO1xyXG5cdFx0ICAgIHRoaXMuZWRpdG9yLmdldFNlc3Npb24oKS5zZXRNb2RlKFwiYWNlL21vZGUvamF2YXNjcmlwdFwiKTtcclxuXHJcblx0XHQgICAgaWYoY29kZSl7XHJcblx0XHRcdFx0dGhpcy5lZGl0b3IuZ2V0U2Vzc2lvbigpLnNldFZhbHVlKGNvZGUsIDEpO1xyXG5cdFx0XHR9XHJcblx0XHR9LFxyXG5cdFx0aW5pdEludGVyYWN0aW9uIDogZnVuY3Rpb24oKXtcclxuXHRcdFx0dmFyIGluaXRpYWxOb2RlID0gdGhpcy5tYXplLmNlbGxzWzBdWzBdO1xyXG5cdFx0XHRpbnRlcmFjdGlvbi5pbml0KHtcclxuXHRcdFx0XHRlbmQgOiB0aGlzLm1hemUuZ2V0RW5kTm9kZSgpLFxyXG5cdFx0XHRcdGNlbGxzIDogdGhpcy5tYXplLmNlbGxzLFxyXG5cdFx0XHRcdGNlbGwgOiB7XHJcblx0XHRcdFx0XHR4IDogaW5pdGlhbE5vZGUueCxcclxuXHRcdFx0XHRcdHkgOiBpbml0aWFsTm9kZS55LFxyXG5cdFx0XHRcdFx0d2lkdGggOiBpbml0aWFsTm9kZS53aWR0aCxcclxuXHRcdFx0XHRcdGhlaWdodCA6IGluaXRpYWxOb2RlLmhlaWdodCxcclxuXHRcdFx0XHRcdHdhbGxzIDoge1xyXG5cdFx0XHRcdFx0XHRyaWdodCA6IGluaXRpYWxOb2RlLndhbGxzLnJpZ2h0LFxyXG5cdFx0XHRcdFx0XHRsZWZ0IDogaW5pdGlhbE5vZGUud2FsbHMubGVmdCxcclxuXHRcdFx0XHRcdFx0dG9wIDogaW5pdGlhbE5vZGUud2FsbHMudG9wLFxyXG5cdFx0XHRcdFx0XHRib3R0b20gOiBpbml0aWFsTm9kZS53YWxscy5ib3R0b21cclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cdFx0fSxcclxuXHRcdGRyYXcgOiBmdW5jdGlvbigpe1xyXG5cdFx0XHR0aGlzLmNvbnRleHQuY2xlYXJSZWN0KDAsMCx0aGlzLmNhbnZhcy53aWR0aCx0aGlzLmNhbnZhcy5oZWlnaHQpO1xyXG5cdFx0XHR0aGlzLm1hemUuZHJhdyh0aGlzLmNvbnRleHQpO1xyXG5cdFx0XHR2YXIgdG9QYWludCA9IGludGVyYWN0aW9uLmdldFRvUGFpbnQoKTtcclxuXHRcdFx0aWYodG9QYWludC5sZW5ndGggPiAwKXtcclxuXHRcdFx0XHR2YXIgaW5kZXggPSB0b1BhaW50Lmxlbmd0aCAtIDI7XHJcblx0XHRcdFx0dmFyIGN1cnJlbnROb2RlID0gaW5kZXggPCAwID8ge21vdmUgOiB0aGlzLm1hemUuY2VsbHNbMF1bMF19IDogdG9QYWludFtpbmRleF07XHJcblx0XHRcdFx0dmFyIG5leHROb2RlID0gdG9QYWludFt0b1BhaW50Lmxlbmd0aCAtIDFdO1xyXG5cdFx0XHRcdHZhciBmaW5hbE5vZGUgPSB0aGlzLm1hemUuZ2V0RW5kTm9kZSgpO1xyXG5cdFx0XHRcdGlmKCF0aGlzLm1hemUuaXNJbnZhbGlkTW92ZShjdXJyZW50Tm9kZS5tb3ZlLG5leHROb2RlLm1vdmUpKXtcclxuXHRcdFx0XHRcdGlmKGZpbmFsTm9kZS54ID09PSBuZXh0Tm9kZS5tb3ZlLnggJiYgZmluYWxOb2RlLnkgPT09IG5leHROb2RlLm1vdmUueSl7XHJcblx0XHRcdFx0XHRcdG5leHROb2RlLmRpcmVjdGlvbiA9IG51bGw7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR0aGlzLm1hemUuZHJhd1Nwcml0ZSh0aGlzLmNvbnRleHQse1xyXG5cdFx0XHRcdFx0XHRpbWFnZSA6ICdoZXJvJ1xyXG5cdFx0XHRcdFx0fSwgbmV4dE5vZGUpO1xyXG5cdFx0XHRcdH1lbHNlIHtcclxuXHRcdFx0XHRcdHRoaXMuaW5pdEludGVyYWN0aW9uKCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9ZWxzZXtcclxuXHRcdFx0XHR0aGlzLm1hemUuZHJhd1Nwcml0ZSh0aGlzLmNvbnRleHQse1xyXG5cdFx0XHRcdFx0XHRpbWFnZSA6ICdoZXJvJ1xyXG5cdFx0XHRcdFx0fSwge1xyXG5cdFx0XHRcdFx0XHRtb3ZlIDogdGhpcy5tYXplLmNlbGxzWzBdWzBdLFxyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdH0sXHJcblx0XHRmZXRjaE1hemUgOiBmdW5jdGlvbigpe1xyXG5cdFx0XHRyZXR1cm4gZmV0Y2goXCIvYXBpL3YxL21hemU/d2lkdGg9XCIrQ29uZmlnLldJRFRIK1wiJmhlaWdodD1cIitDb25maWcuSEVJR0hULHtcclxuXHRcdFx0XHRtZXRob2Q6ICdHRVQnLCBcclxuXHRcdFx0XHRoZWFkZXJzOiBuZXcgSGVhZGVycyh7XHJcblx0XHRcdFx0XHQnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nXHJcblx0XHRcdFx0fSlcclxuXHRcdFx0fSkudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XHJcblx0XHRcdFx0cmV0dXJuIHJlc3BvbnNlLmpzb24oKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9LFxyXG5cdFx0ZmV0Y2hNYXplU29sdXRpb24gOiBmdW5jdGlvbihkYXRhKXtcclxuXHRcdFx0cmV0dXJuIGZldGNoKFwiL2FwaS92MS9tYXplL3NvbHV0aW9uXCIse1xyXG5cdFx0XHRcdG1ldGhvZDogJ1BPU1QnLCBcclxuXHRcdFx0XHRib2R5IDogSlNPTi5zdHJpbmdpZnkoZGF0YSksXHJcblx0XHRcdFx0aGVhZGVyczogbmV3IEhlYWRlcnMoe1xyXG5cdFx0XHRcdFx0J0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJ1xyXG5cdFx0XHRcdH0pXHJcblx0XHRcdH0pLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xyXG5cdFx0XHRcdHJldHVybiByZXNwb25zZS5qc29uKCk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSxcclxuXHR9O1xyXG5cclxuXHRtYWluID0gbmV3IE1haW4oKTtcclxuXHJcblx0d2luZG93Lm9ubG9hZCA9IG1haW4uaW5pdC5iaW5kKG1haW4pO1xyXG5cclxufSgpKTsiLCJtb2R1bGUuZXhwb3J0cyA9IChmdW5jdGlvbigpe1xyXG5cclxuXHR2YXIgV2FsbCA9IHJlcXVpcmUoXCIuL3dhbGxcIiksXHJcblx0XHRDb25maWcgPSByZXF1aXJlKFwiLi9jb25maWctbWF6ZVwiKTtcclxuXHJcblx0ZnVuY3Rpb24gQ2VsbChyYXdDZWxsKXtcclxuXHRcdHRoaXMud2FsbHMgPSB7XHJcblx0XHRcdGxlZnQgOiBudWxsLFxyXG5cdFx0XHRyaWdodCA6IG51bGwsXHJcblx0XHRcdHRvcCA6IG51bGwsXHJcblx0XHRcdGJvdHRvbSA6IG51bGxcclxuXHRcdH07XHJcblx0XHR0aGlzLmluaXQocmF3Q2VsbCk7XHJcblx0fVxyXG5cclxuXHRDZWxsLnByb3RvdHlwZSA9IHtcclxuXHRcdG5hbWVzIDogW1wibGVmdFwiLFwicmlnaHRcIixcInRvcFwiLFwiYm90dG9tXCJdLFxyXG5cdFx0eCA6IDAsXHJcblx0XHR5IDogMCxcclxuXHRcdHdpZHRoIDogQ29uZmlnLkNFTExfU0laRSxcclxuXHRcdGhlaWdodCA6IENvbmZpZy5DRUxMX1NJWkUsXHJcblx0XHR2aXNpdGVkIDogZmFsc2UsXHJcblx0XHR3YWxscyA6IHtcclxuXHRcdFx0bGVmdCA6IG51bGwsXHJcblx0XHRcdHJpZ2h0IDogbnVsbCxcclxuXHRcdFx0dG9wIDogbnVsbCxcclxuXHRcdFx0Ym90dG9tIDogbnVsbFxyXG5cdFx0fSxcclxuXHRcdGluaXQgOiBmdW5jdGlvbihwcm9wcyl7XHJcblx0XHRcdHRoaXMueCA9IHByb3BzLng7XHJcblx0XHRcdHRoaXMueSA9IHByb3BzLnk7XHJcblx0XHRcdHRoaXMud2lkdGggPSBwcm9wcy53aWR0aDtcclxuXHRcdFx0dGhpcy5oZWlnaHQgPSBwcm9wcy5oZWlnaHQ7XHJcblx0XHRcdHRoaXMuY3JlYXRlV2FsbHMocHJvcHMud2FsbHMpO1xyXG5cdFx0fSxcclxuXHRcdGNyZWF0ZVdhbGxzIDogZnVuY3Rpb24ocHJvcHMpe1xyXG5cdFx0XHR2YXIgc2VsZiA9IHRoaXM7XHJcblx0XHRcdGZvcih2YXIgcCBpbiBwcm9wcyl7XHJcblx0XHRcdFx0dmFyIG9iaiA9IHByb3BzW3BdO1xyXG5cdFx0XHRcdGlmKCFvYmope1xyXG5cdFx0XHRcdFx0dGhpcy53YWxsc1twXSA9IG51bGw7XHJcblx0XHRcdFx0fWVsc2V7XHJcblx0XHRcdFx0XHR0aGlzLndhbGxzW3BdID0gbmV3IFdhbGwoe1xyXG5cdFx0XHRcdFx0XHRuYW1lIDogcCxcclxuXHRcdFx0XHRcdFx0eCA6IG9iai54LFxyXG5cdFx0XHRcdFx0XHR5IDogb2JqLnksXHJcblx0XHRcdFx0XHRcdGhlaWdodCA6IG9iai5oZWlnaHQsXHJcblx0XHRcdFx0XHRcdHdpZHRoIDogb2JqLndpZHRoXHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH0sXHJcblx0XHRkcmF3IDogZnVuY3Rpb24oY29udGV4dCl7XHJcblx0XHRcdHRoaXMubmFtZXMuZm9yRWFjaChmdW5jdGlvbihuYW1lKXtcclxuXHRcdFx0XHR2YXIgd2FsbCA9IHRoaXMud2FsbHNbbmFtZV07XHJcblx0XHRcdFx0aWYod2FsbCl7XHJcblx0XHRcdFx0XHR3YWxsLmRyYXcoY29udGV4dCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9LHRoaXMpO1xyXG5cdFx0fVxyXG5cdH07XHJcblxyXG5cdHJldHVybiBDZWxsO1xyXG5cclxufSgpKTsiLCJtb2R1bGUuZXhwb3J0cyA9IHtcclxuXHRDRUxMX1NJWkUgOiAyMCxcclxuXHRXSURUSCA6MjAsXHJcblx0SEVJR0hUIDogMjBcclxufTsiLCJtb2R1bGUuZXhwb3J0cyA9IChmdW5jdGlvbigpe1xyXG5cclxuXHRmdW5jdGlvbiBJbWFnZUZhY3RvcnkoKXt9XHJcblxyXG5cdHZhciBwYXRoID0gJy9hcHAvaW1nLycsXHJcbiAgICAgICAgZXh0ID0gJy5wbmcnLFxyXG4gICAgICAgIGxvYWRlZD17fTtcclxuICAgIFxyXG4gICAgSW1hZ2VGYWN0b3J5LnByb3RvdHlwZSA9IHtcclxuICAgIFx0bG9hZEltYWdlIDogZnVuY3Rpb24obmFtZSl7XHJcblx0ICAgICAgICB2YXIgaW1hZ2UgPSBudWxsO1xyXG5cdCAgICAgICAgaWYoIWxvYWRlZFtuYW1lICsgZXh0XSl7XHJcblx0ICAgICAgICAgICAgaW1hZ2UgPSBuZXcgSW1hZ2UoKTtcclxuXHQgICAgICAgICAgICAvKmltYWdlLm9ubG9hZCA9IGZ1bmN0aW9uKCl7XHJcblx0ICAgICAgICAgICAgXHRcclxuXHQgICAgICAgICAgICB9OyovXHJcblx0ICAgICAgICAgICAgbG9hZGVkW25hbWUgKyBleHRdID0gaW1hZ2U7XHJcblx0ICAgICAgICAgICAgaW1hZ2Uuc3JjID0gcGF0aCArIG5hbWUgKyBleHQ7XHJcblx0ICAgICAgICB9ZWxzZXtcclxuXHQgICAgICAgICAgICBpbWFnZSA9IGxvYWRlZFtuYW1lICsgZXh0XTtcclxuXHQgICAgICAgIH1cclxuXHQgICAgICAgIHJldHVybiBpbWFnZTtcclxuXHQgICAgfSxcclxuXHQgICAgZ2V0SW1hZ2UgOiBmdW5jdGlvbihuYW1lKXtcclxuXHQgICAgICAgIHJldHVybiBsb2FkZWRbbmFtZSArIGV4dF07XHJcblx0ICAgIH1cclxuICAgIH07XHJcblxyXG5cdHJldHVybiBJbWFnZUZhY3Rvcnk7XHJcblxyXG59KCkpOyIsIm1vZHVsZS5leHBvcnRzID0gKGZ1bmN0aW9uKCl7XHJcblxyXG5cdHZhciBDZWxsID0gcmVxdWlyZShcIi4vY2VsbFwiKTtcclxuXHR2YXIgSW1hZ2VGYWN0b3J5ID0gcmVxdWlyZShcIi4vaW1hZ2VzXCIpO1xyXG5cdHZhciBlbmQgPSBudWxsO1xyXG5cdHZhciBkZWZhdWx0RGlyZWN0aW9uID0ge1xyXG5cdFx0XHRkaXJlY3Rpb24gOiAnYm90dG9tJyxcclxuXHRcdFx0aW5kZXggOiAwLFxyXG5cdFx0XHRwb3NpdGlvbnMgOiBbXHJcblx0XHRcdFx0e3ggOiAwICx5IDogMH0sXHJcblx0XHQgICAgXHR7eCA6IDEgLHkgOiAwfSxcclxuXHRcdCAgICBcdHt4IDogMiAseSA6IDB9XHJcblx0XHQgICAgXVxyXG5cdH07XHJcblxyXG5cdGZ1bmN0aW9uIE1hemUocHJvcHMpe1xyXG5cdFx0SW1hZ2VGYWN0b3J5ID0gbmV3IEltYWdlRmFjdG9yeSgpO1xyXG5cdFx0dGhpcy5pbml0KHByb3BzKTtcclxuXHR9XHJcblxyXG5cdE1hemUucHJvdG90eXBlID0ge1xyXG5cdFx0Y3VycmVudERpcmVjdGlvbiA6IGRlZmF1bHREaXJlY3Rpb24sXHJcblx0XHR3aWR0aCA6IDAsXHJcblx0XHRoZWlnaHQgOiAwLFxyXG5cdFx0Y2VsbHMgOiBbXSxcclxuXHRcdGdldEVuZE5vZGUgOiBmdW5jdGlvbigpe1xyXG5cdFx0XHRyZXR1cm4gZW5kO1xyXG5cdFx0fSxcclxuXHRcdGluaXQgOiBmdW5jdGlvbihwcm9wcyl7XHJcblx0XHRcdEltYWdlRmFjdG9yeS5sb2FkSW1hZ2UoJ2hlcm8nKTtcclxuXHRcdFx0dGhpcy53aWR0aCA9IHByb3BzLndpZHRoO1xyXG5cdFx0XHR0aGlzLmhlaWdodCA9IHByb3BzLmhlaWdodDtcclxuXHRcdFx0dGhpcy5jcmVhdGVDZWxscyhwcm9wcy5jZWxscyk7XHJcblx0XHRcdGVuZCA9IHRoaXMuZ2V0UmFuZG9tUG9zaXRpb24oKTtcclxuXHRcdFx0c2V0SW50ZXJ2YWwoZnVuY3Rpb24oKXtcclxuXHRcdFx0XHR0aGlzLmN1cnJlbnREaXJlY3Rpb24uaW5kZXggKz0gMTtcclxuXHRcdFx0XHRpZih0aGlzLmN1cnJlbnREaXJlY3Rpb24uaW5kZXggPT09IDMpe1xyXG5cdFx0XHRcdFx0dGhpcy5jdXJyZW50RGlyZWN0aW9uLmluZGV4ID0gMDtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0uYmluZCh0aGlzKSwgMTAwMCAvIDUpO1xyXG5cdFx0fSxcclxuXHRcdGNyZWF0ZUNlbGxzIDogZnVuY3Rpb24ocmF3Q2VsbHMpe1xyXG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHJhd0NlbGxzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHQgICAgICAgIHRoaXMuY2VsbHNbaV0gPSBbXTtcclxuXHRcdCAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCByYXdDZWxsc1tpXS5sZW5ndGg7IGorKykge1xyXG5cdFx0ICAgICAgICAgICAgdGhpcy5jZWxsc1tpXVtqXSA9IG5ldyBDZWxsKHJhd0NlbGxzW2ldW2pdKTtcclxuXHRcdCAgICAgICAgfVxyXG5cdFx0ICAgIH1cclxuXHRcdH0sXHJcblx0XHRkcmF3IDogZnVuY3Rpb24oY29udGV4dCl7XHJcblx0XHRcdHRoaXMuZmlsbENlbGwoY29udGV4dCx0aGlzLmNlbGxzW2VuZC54XVtlbmQueV0sIFwicmVkXCIpO1xyXG5cdFx0XHR0aGlzLmNlbGxzLmZvckVhY2goZnVuY3Rpb24gKHJvd3MpIHtcclxuXHRcdFx0XHRyb3dzLmZvckVhY2goZnVuY3Rpb24oY2VsbCl7XHJcblx0XHRcdFx0XHRjZWxsLmRyYXcoY29udGV4dCk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSxcclxuXHRcdGlzSW52YWxpZE1vdmUgOiBmdW5jdGlvbihjdXJyZW50Tm9kZSxuZXh0Tm9kZSl7XHJcblxyXG4gICAgICAgIFx0aWYobmV4dE5vZGUueCA+IGN1cnJlbnROb2RlLnggJiYgY3VycmVudE5vZGUud2FsbHMucmlnaHQpe1xyXG4gICAgICAgIFx0XHRyZXR1cm4gdHJ1ZTtcclxuICAgICAgICBcdH1cclxuXHJcbiAgICAgICAgXHRpZihuZXh0Tm9kZS55IDwgY3VycmVudE5vZGUueSAmJiBjdXJyZW50Tm9kZS53YWxscy50b3Ape1xyXG4gICAgICAgIFx0XHRyZXR1cm4gdHJ1ZTtcclxuICAgICAgICBcdH1cclxuXHJcbiAgICAgICAgXHRpZihuZXh0Tm9kZS55ID4gY3VycmVudE5vZGUueSAmJiBjdXJyZW50Tm9kZS53YWxscy5ib3R0b20pe1xyXG4gICAgICAgIFx0XHRyZXR1cm4gdHJ1ZTtcclxuICAgICAgICBcdH1cclxuXHJcbiAgICAgICAgXHRpZihuZXh0Tm9kZS54IDwgY3VycmVudE5vZGUueCAmJiBjdXJyZW50Tm9kZS53YWxscy5sZWZ0KXtcclxuICAgICAgICBcdFx0cmV0dXJuIHRydWU7XHJcbiAgICAgICAgXHR9XHJcblx0XHR9LFxyXG5cdFx0ZmlsbENlbGwgOiBmdW5jdGlvbihjb250ZXh0LGNlbGwsY29sb3Ipe1xyXG5cdFx0XHRjb250ZXh0LmZpbGxTdHlsZSA9IGNvbG9yO1xyXG5cdFx0XHR2YXIgeCA9IChjZWxsLnggKiBjZWxsLndpZHRoKSArIDU7XHJcblx0XHRcdHZhciB5ID0gKGNlbGwueSAqIGNlbGwuaGVpZ2h0KSArIDU7XHJcblx0XHRcdGNvbnRleHQuZmlsbFJlY3QoeCx5LGNlbGwud2lkdGggLyAyLGNlbGwuaGVpZ2h0IC8gMik7XHJcblx0XHR9LFxyXG5cdFx0ZHJhd1Nwcml0ZSA6IGZ1bmN0aW9uKGNvbnRleHQsc3ByaXRlLG5leHRNb3ZlKXtcclxuXHRcdFx0dmFyIGNlbGwgPSBuZXh0TW92ZS5tb3ZlO1xyXG5cdFx0XHR2YXIgeCA9IGNlbGwueCAqIGNlbGwud2lkdGg7XHJcblx0XHRcdHZhciB5ID0gY2VsbC55ICogY2VsbC5oZWlnaHQ7XHJcblx0XHRcdHZhciBpbWFnZSA9IEltYWdlRmFjdG9yeS5nZXRJbWFnZShzcHJpdGUuaW1hZ2UpO1xyXG5cdFx0XHR2YXIgcG9zaXRpb25zID0gbnVsbDtcclxuXHRcdFx0dmFyIHBvcyA9IHRoaXMuY3VycmVudERpcmVjdGlvbi5wb3NpdGlvbnNbMF07XHJcblxyXG5cdFx0XHRpZihuZXh0TW92ZS5kaXJlY3Rpb24pe1xyXG5cdFx0XHRcdHBvc2l0aW9ucyA9IHRoaXMuZ2V0U3ByaXRlUG9zaXRpb24obmV4dE1vdmUuZGlyZWN0aW9uKTtcclxuXHRcdFx0XHRpZihuZXh0TW92ZS5kaXJlY3Rpb24gIT09IHRoaXMuY3VycmVudERpcmVjdGlvbi5kaXJlY3Rpb24pe1xyXG5cdFx0XHRcdFx0dGhpcy5jdXJyZW50RGlyZWN0aW9uLmluZGV4ID0gMDtcclxuXHRcdFx0XHRcdHRoaXMuY3VycmVudERpcmVjdGlvbi5kaXJlY3Rpb24gPSBuZXh0TW92ZS5kaXJlY3Rpb247XHJcblx0XHRcdFx0XHR0aGlzLmN1cnJlbnREaXJlY3Rpb24ucG9zaXRpb25zID0gcG9zaXRpb25zO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRwb3MgPSB0aGlzLmN1cnJlbnREaXJlY3Rpb24ucG9zaXRpb25zW3RoaXMuY3VycmVudERpcmVjdGlvbi5pbmRleF07XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGNvbnRleHQuZHJhd0ltYWdlKGltYWdlLCBcclxuXHRcdFx0XHRwb3MueCAqIGNlbGwud2lkdGgsIFxyXG5cdFx0XHRcdHBvcy55ICogY2VsbC5oZWlnaHQsIFxyXG5cdFx0XHRcdGNlbGwud2lkdGgsIFxyXG5cdFx0XHRcdGNlbGwuaGVpZ2h0LCBcclxuXHRcdFx0XHR4LCBcclxuXHRcdFx0XHR5LCBcclxuXHRcdFx0XHRjZWxsLndpZHRoLCBcclxuXHRcdFx0XHRjZWxsLmhlaWdodCk7XHJcblx0XHR9LFxyXG5cdFx0Z2V0U3ByaXRlUG9zaXRpb24gOiBmdW5jdGlvbihkaXJlY3Rpb24pe1xyXG5cdFx0XHR2YXIgcG9zaXRpb25zID0gW107XHJcblx0XHRcdHN3aXRjaChkaXJlY3Rpb24pe1xyXG4gICAgICAgICAgICAgICAgY2FzZSAnYm90dG9tJzogXHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvbnMgPSBbXHJcbiAgICAgICAgICAgICAgICBcdHt4IDogMCAseSA6IDB9LFxyXG4gICAgICAgICAgICAgICAgXHR7eCA6IDEgLHkgOiAwfSxcclxuICAgICAgICAgICAgICAgIFx0e3ggOiAyICx5IDogMH1cclxuICAgICAgICAgICAgICAgIF07ICBcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSAncmlnaHQnOiAgXHJcblx0ICAgICAgICAgICAgICAgIHBvc2l0aW9ucyA9IFtcclxuXHQgICAgICAgICAgICAgICAgXHR7eCA6IDMgLHkgOiAwfSxcclxuXHQgICAgICAgICAgICAgICAgXHR7eCA6IDQgLHkgOiAwfSxcclxuXHQgICAgICAgICAgICAgICAgXHR7eCA6IDUgLHkgOiAwfVxyXG5cdCAgICAgICAgICAgICAgICBdO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlICdsZWZ0JzogXHJcbiAgICAgICAgICAgICAgICBcdHBvc2l0aW9ucyA9IFtcclxuXHQgICAgICAgICAgICAgICAgXHR7eCA6IDYgLHkgOiAwfSxcclxuXHQgICAgICAgICAgICAgICAgXHR7eCA6IDcgLHkgOiAwfSxcclxuXHQgICAgICAgICAgICAgICAgXHR7eCA6IDggLHkgOiAwfVxyXG5cdCAgICAgICAgICAgICAgICBdO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlICd0b3AnOiBcclxuICAgICAgICAgICAgICAgIFx0cG9zaXRpb25zID0gW1xyXG5cdCAgICAgICAgICAgICAgICBcdHt4IDogOSAseSA6IDB9LFxyXG5cdCAgICAgICAgICAgICAgICBcdHt4IDogMTAgLHkgOiAwfSxcclxuXHQgICAgICAgICAgICAgICAgXHR7eCA6IDExICx5IDogMH1cclxuXHQgICAgICAgICAgICAgICAgXTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBwb3NpdGlvbnM7XHJcblx0XHR9LFxyXG5cdFx0Y2xlYXJDZWxsIDogZnVuY3Rpb24oY29udGV4dCxjZWxsKXtcclxuXHRcdFx0dmFyIHggPSAoY2VsbC54ICogY2VsbC53aWR0aCkgKyA1O1xyXG5cdFx0XHR2YXIgeSA9IChjZWxsLnkgKiBjZWxsLmhlaWdodCkgKyA1O1xyXG5cdFx0XHRjb250ZXh0LmNsZWFyUmVjdCh4LHksY2VsbC53aWR0aCAvIDIsY2VsbC5oZWlnaHQgLyAyKTtcclxuXHRcdH0sXHJcblx0XHRnZXRSYW5kb21Qb3NpdGlvbjpmdW5jdGlvbigpe1xyXG5cdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdHggOiBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiB0aGlzLndpZHRoKSxcclxuICAgICAgICBcdFx0eSA6IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIHRoaXMuaGVpZ2h0KVxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fTtcclxuXHJcblx0cmV0dXJuIE1hemU7XHJcblxyXG59KCkpOyIsIm1vZHVsZS5leHBvcnRzPShmdW5jdGlvbigpe1xyXG5cclxuXHR2YXIgb25Nb3VzZU1vdmVDYWxsQmFjaztcclxuXHJcblx0ZnVuY3Rpb24gTW91c2VFdmVudExpc3RlbmVyKHByb3BzKXtcclxuXHRcdHRoaXMuaW5pdChwcm9wcyk7XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBnZXRNb3VzZVBvcyhlbGVtZW50LCBldnQpIHtcclxuICAgICAgICB2YXIgcmVjdCA9IGVsZW1lbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgIHg6IGV2dC5jbGllbnRYIC0gcmVjdC5sZWZ0LFxyXG4gICAgICAgICAgeTogZXZ0LmNsaWVudFkgLSByZWN0LnRvcFxyXG4gICAgICAgIH07XHJcbiAgICAgIH1cclxuXHJcblx0TW91c2VFdmVudExpc3RlbmVyLnByb3RvdHlwZSA9IHtcclxuXHRcdFx0ZWxlbWVudCA6IG51bGwsXHJcblx0XHQgICAgaW5pdCA6IGZ1bmN0aW9uKHByb3BzKXtcclxuXHRcdCAgICBcdHRoaXMuZWxlbWVudCA9IHByb3BzLmVsZW1lbnQ7XHJcblx0XHQgICAgXHRvbk1vdXNlTW92ZUNhbGxCYWNrID0gcHJvcHMub25Nb3VzZU1vdmUgfHwgZnVuY3Rpb24oKXt9O1xyXG5cdFx0ICAgICAgICB0aGlzLmJpbmRFdmVudHMoKTtcclxuXHRcdCAgICB9LFxyXG5cdFx0ICAgIGJpbmRFdmVudHMgOiBmdW5jdGlvbigpe1xyXG5cdFx0ICAgICAgICB0aGlzLmVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJyxmdW5jdGlvbihlKXtcclxuXHRcdCAgICAgICAgXHR0aGlzLm9uTW91c2VNb3ZlKGUsdGhpcy5lbGVtZW50KTtcclxuXHRcdCAgICAgICAgfS5iaW5kKHRoaXMpLGZhbHNlKTtcclxuXHRcdCAgICB9LFxyXG5cdFx0ICAgIG9uTW91c2VNb3ZlIDogZnVuY3Rpb24oZSxlbGVtZW50KXtcclxuXHRcdFx0XHR2YXIgcG9zaXRpb24gPSBnZXRNb3VzZVBvcyhlbGVtZW50LGUpO1xyXG5cdFx0XHRcdG9uTW91c2VNb3ZlQ2FsbEJhY2socG9zaXRpb24ueCxwb3NpdGlvbi55KTtcclxuXHRcdFx0fVxyXG5cdH07XHJcbiAgICBcclxuXHJcblx0cmV0dXJuIE1vdXNlRXZlbnRMaXN0ZW5lcjtcclxuXHJcbn0oKSk7IiwibW9kdWxlLmV4cG9ydHMgPSAoZnVuY3Rpb24oKXtcclxuXHJcblx0dmFyIGNlbGxzID0gW10sXHJcblx0XHRlbmQgPSBudWxsLCBcclxuXHRcdGNlbGwgPSBudWxsLCBcclxuXHRcdG1vdmVzID0gW10sXHJcblx0XHR0b0JlUGFpbnQgPSBbXSxcclxuXHRcdG1vdmVQcm9taXNlcyA9IFtdLFxyXG5cdFx0Y29udGV4dCxcclxuXHRcdGZwcyA9IDEwMDAgLyA1O1xyXG5cclxuXHRmdW5jdGlvbiBVc2VySW50ZXJhY3Rpb24ocHJvcHMpe1xyXG5cdFx0dGhpcy5pbml0KHByb3BzKTtcclxuXHR9XHJcblxyXG5cdFVzZXJJbnRlcmFjdGlvbi5wcm90b3R5cGUgPSB7XHJcblx0XHR4IDogMCxcclxuXHRcdHkgOiAwLFxyXG5cdFx0Z2V0TW92ZXMgOiBmdW5jdGlvbigpe1xyXG5cdFx0XHRyZXR1cm4gbW92ZXM7XHJcblx0XHR9LFxyXG5cdFx0Z2V0VG9QYWludCA6IGZ1bmN0aW9uKCl7XHJcblx0XHRcdHJldHVybiB0b0JlUGFpbnQ7XHJcblx0XHR9LFxyXG5cdFx0aW5pdCA6IGZ1bmN0aW9uKHByb3BzKXtcclxuXHRcdFx0Y2VsbCA9IHByb3BzLmNlbGw7XHJcblx0XHRcdGVuZCA9IHByb3BzLmVuZDtcclxuXHRcdFx0Y2VsbHMgPSBwcm9wcy5jZWxscztcclxuXHRcdFx0bW92ZXMgPSBbXTtcclxuXHRcdFx0dG9CZVBhaW50ID0gW107XHJcblx0XHRcdG1vdmVQcm9taXNlcy5mb3JFYWNoKGZ1bmN0aW9uKHByb21pc2Upe1xyXG5cdFx0XHRcdGNsZWFyVGltZW91dChwcm9taXNlKTtcclxuXHRcdFx0fSk7XHJcblx0XHRcdHRoaXMueCA9IDA7XHJcblx0XHRcdHRoaXMueSA9IDA7XHJcblx0XHR9LFxyXG5cdFx0aXNDb21wbGV0ZSA6IGZ1bmN0aW9uKCl7XHJcblx0XHRcdHJldHVybiBjZWxsLnggPT09IGVuZC54ICYmIGNlbGwueSA9PT0gZW5kLnk7XHJcblx0XHR9LFxyXG5cdFx0bW92ZVRvIDogZnVuY3Rpb24oZGlyZWN0aW9uKXtcclxuXHRcdFx0dmFyIG5leHRNb3ZlID0gdGhpcy5nZXROZXh0TW92ZShkaXJlY3Rpb24pO1xyXG5cdFx0XHRtb3Zlcy5wdXNoKG5leHRNb3ZlKTtcclxuXHRcdFx0bW92ZVByb21pc2VzLnB1c2goc2V0VGltZW91dChmdW5jdGlvbigpe1xyXG5cdFx0XHRcdHRvQmVQYWludC5wdXNoKHtcclxuXHRcdFx0XHRcdG1vdmUgOiBuZXh0TW92ZSxcclxuXHRcdFx0XHRcdGRpcmVjdGlvbiA6IGRpcmVjdGlvblxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9LmJpbmQodGhpcyksIG1vdmVzLmxlbmd0aCAqIGZwcykpO1xyXG5cdFx0XHRyZXR1cm4gbmV4dE1vdmU7XHJcblx0XHR9LFxyXG5cdFx0Y2FuTW92ZVRvIDogZnVuY3Rpb24oZGlyZWN0aW9uKXtcclxuXHRcdFx0dmFyIGxhc3RNb3ZlID0gbW92ZXNbbW92ZXMubGVuZ3RoIC0gMV0gfHwgdGhpcy5nZXRTaW5nbGVNb3ZlKCk7XHJcblx0XHRcdHJldHVybiBsYXN0TW92ZS53YWxsc1tkaXJlY3Rpb25dID09PSBudWxsO1xyXG5cdFx0fSxcclxuXHRcdGdldE5leHRNb3ZlIDogZnVuY3Rpb24oZGlyZWN0aW9uKXtcclxuXHJcblx0XHRcdHN3aXRjaChkaXJlY3Rpb24pe1xyXG5cdFx0XHRcdGNhc2UgJ2xlZnQnIDogXHJcblx0XHRcdFx0Y2VsbC54LT0xO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdGNhc2UgJ3JpZ2h0JyA6IFxyXG5cdFx0XHRcdGNlbGwueCArPSAxO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdGNhc2UgJ2JvdHRvbScgOiBcclxuXHRcdFx0XHRjZWxsLnkgKz0gMTtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRjYXNlICd0b3AnIDogXHJcblx0XHRcdFx0Y2VsbC55IC09IDE7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHZhciByZXN1bHQgPSB0aGlzLmdldFNpbmdsZU1vdmUoKTtcclxuXHJcblx0XHRcdHRoaXMueCA9IHJlc3VsdC54O1xyXG5cdFx0XHR0aGlzLnkgPSByZXN1bHQueTtcclxuXHJcblx0XHRcdHJldHVybiByZXN1bHQ7XHJcblx0XHRcdFxyXG5cdFx0fSxcclxuXHRcdGdldFNpbmdsZU1vdmUgOiBmdW5jdGlvbigpe1xyXG5cdFx0XHR2YXIgaW5pdGlhbE5vZGUgPSBjZWxsc1tjZWxsLnhdW2NlbGwueV07XHJcblxyXG5cdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdHggOiBpbml0aWFsTm9kZS54LFxyXG5cdFx0XHRcdHkgOiBpbml0aWFsTm9kZS55LFxyXG5cdFx0XHRcdHdpZHRoIDogaW5pdGlhbE5vZGUud2lkdGgsXHJcblx0XHRcdFx0aGVpZ2h0IDogaW5pdGlhbE5vZGUuaGVpZ2h0LFxyXG5cdFx0XHRcdHdhbGxzIDoge1xyXG5cdFx0XHRcdFx0cmlnaHQgOiBpbml0aWFsTm9kZS53YWxscy5yaWdodCxcclxuXHRcdFx0XHRcdGxlZnQgOiBpbml0aWFsTm9kZS53YWxscy5sZWZ0LFxyXG5cdFx0XHRcdFx0dG9wIDogaW5pdGlhbE5vZGUud2FsbHMudG9wLFxyXG5cdFx0XHRcdFx0Ym90dG9tIDogaW5pdGlhbE5vZGUud2FsbHMuYm90dG9tXHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9O1xyXG5cdFx0fSxcclxuXHRcdGV4ZWN1dGUgOiBmdW5jdGlvbihydW5GdW5jdGlvbil7XHJcblx0XHRcdGlmKHJ1bkZ1bmN0aW9uICYmIHR5cGVvZiBydW5GdW5jdGlvbiA9PT0gXCJmdW5jdGlvblwiKXtcclxuXHRcdFx0XHRydW5GdW5jdGlvbigpO1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKG1vdmVzLmxlbmd0aCk7XHJcblx0XHRcdH1cclxuXHRcdH0sXHJcblx0fTtcclxuXHJcblxyXG5cdHJldHVybiBVc2VySW50ZXJhY3Rpb247XHJcblxyXG59KCkpOyIsIm1vZHVsZS5leHBvcnRzID0gKGZ1bmN0aW9uKCl7XHJcblxyXG5cdGZ1bmN0aW9uIFdhbGwocHJvcHMpe1xyXG5cdFx0dGhpcy5uYW1lID0gcHJvcHMubmFtZTtcclxuXHRcdHRoaXMuY29sb3IgPSBwcm9wcy5jb2xvciB8fCB0aGlzLmNvbG9yO1xyXG5cdFx0dGhpcy54ID0gcHJvcHMueDtcclxuXHRcdHRoaXMueSA9IHByb3BzLnk7XHJcblx0XHR0aGlzLndpZHRoID0gcHJvcHMud2lkdGg7XHJcblx0XHR0aGlzLmhlaWdodCA9IHByb3BzLmhlaWdodDtcclxuXHR9XHJcblxyXG5cdFdhbGwucHJvdG90eXBlID0ge1xyXG5cdFx0eCA6IDAsXHJcblx0XHR5IDogMCxcclxuXHRcdGhlaWdodCA6IDAsXHJcblx0XHR3aWR0aCA6IDAsXHJcblx0XHRuYW1lIDogXCJcIixcclxuXHRcdGNvbG9yIDogXCJncmF5XCIsXHJcblx0XHRkcmF3IDogZnVuY3Rpb24oY29udGV4dCl7XHJcblx0XHRcdHRoaXNbdGhpcy5uYW1lXShjb250ZXh0KTtcclxuXHRcdH0sXHJcblx0XHRsZWZ0OmZ1bmN0aW9uKGNvbnRleHQpe1xyXG5cdFx0XHRjb250ZXh0LnN0cm9rZVN0eWxlID0gdGhpcy5jb2xvcjtcclxuXHRcdFx0Y29udGV4dC5iZWdpblBhdGgoKTtcclxuXHRcdFx0Y29udGV4dC5tb3ZlVG8odGhpcy54ICogdGhpcy53aWR0aCx0aGlzLnkgKiB0aGlzLmhlaWdodCk7XHJcblx0XHRcdGNvbnRleHQubGluZVRvKHRoaXMueCAqIHRoaXMud2lkdGgsKHRoaXMueSArIDEpICogdGhpcy5oZWlnaHQpO1xyXG5cdFx0XHRjb250ZXh0LnN0cm9rZSgpO1xyXG5cdFx0fSxcclxuXHRcdHJpZ2h0OmZ1bmN0aW9uKGNvbnRleHQpe1xyXG5cdFx0XHRjb250ZXh0LnN0cm9rZVN0eWxlID0gdGhpcy5jb2xvcjtcclxuXHRcdFx0Y29udGV4dC5iZWdpblBhdGgoKTtcclxuXHRcdFx0Y29udGV4dC5tb3ZlVG8oKHRoaXMueCAqIHRoaXMud2lkdGgpICsgdGhpcy53aWR0aCx0aGlzLnkgKiB0aGlzLmhlaWdodCk7XHJcblx0XHRcdGNvbnRleHQubGluZVRvKCh0aGlzLnggKyAxKSAqIHRoaXMud2lkdGgsICh0aGlzLnkgKyAxKSAqIHRoaXMuaGVpZ2h0KTtcclxuXHRcdFx0Y29udGV4dC5zdHJva2UoKTtcclxuXHRcdH0sXHJcblx0XHR0b3AgOiBmdW5jdGlvbihjb250ZXh0KXtcclxuXHRcdFx0Y29udGV4dC5zdHJva2VTdHlsZSA9IHRoaXMuY29sb3I7XHJcblx0XHRcdGNvbnRleHQuYmVnaW5QYXRoKCk7XHJcblx0XHRcdGNvbnRleHQubW92ZVRvKHRoaXMueCAqIHRoaXMud2lkdGgsdGhpcy55ICogdGhpcy5oZWlnaHQpO1xyXG5cdFx0XHRjb250ZXh0LmxpbmVUbygodGhpcy54ICogdGhpcy53aWR0aCkgKyB0aGlzLndpZHRoLHRoaXMueSAqIHRoaXMuaGVpZ2h0KTtcclxuXHRcdFx0Y29udGV4dC5zdHJva2UoKTtcdFxyXG5cdFx0fSxcclxuXHRcdGJvdHRvbSA6IGZ1bmN0aW9uKGNvbnRleHQpe1xyXG5cdFx0XHRjb250ZXh0LnN0cm9rZVN0eWxlID0gdGhpcy5jb2xvcjtcclxuXHRcdFx0Y29udGV4dC5iZWdpblBhdGgoKTtcclxuXHRcdFx0Y29udGV4dC5tb3ZlVG8odGhpcy54ICogdGhpcy53aWR0aCwodGhpcy55ICogdGhpcy5oZWlnaHQpICsgdGhpcy5oZWlnaHQpO1xyXG5cdFx0XHRjb250ZXh0LmxpbmVUbygodGhpcy54ICogdGhpcy53aWR0aCkgKyB0aGlzLndpZHRoLCh0aGlzLnkgKyAxKSAqIHRoaXMuaGVpZ2h0KTtcclxuXHRcdFx0Y29udGV4dC5zdHJva2UoKTtcclxuXHRcdH1cclxuXHR9O1xyXG5cclxuXHRyZXR1cm4gV2FsbDtcclxuXHJcbn0oKSk7Il19
